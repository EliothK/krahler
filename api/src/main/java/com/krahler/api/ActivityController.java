package com.krahler.api;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonProperty;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

/**
 * Stands in for the browser's own call to GitHub (src/scripts/activity.ts), which shared the unauthenticated 60 requests/hour limit across every visitor behind the same IP.
 * This holds a token server-side (5,000/hour) and caches the answer briefly, so one visitor's page load can't exhaust what every other visitor sees.
 * The build-time snapshot is still what ships in the prerendered HTML and is still the fallback if this is ever unreachable.
 */
@RestController
class ActivityController {

    private static final Logger log = LoggerFactory.getLogger(ActivityController.class);

    record RepoActivity(
            String name, String description, String url, String pushedAt, String language, Integer commits) {
    }

    record Activity(String generatedAt, List<RepoActivity> repos) {
    }

    private record GhRepo(
            String name,
            String description,
            @JsonProperty("html_url") String htmlUrl,
            @JsonProperty("pushed_at") String pushedAt,
            String language,
            boolean fork,
            boolean archived) {
    }

    private record GhEventPayload(Integer size) {
    }

    private record GhEventRepo(String name) {
    }

    private record GhEvent(String type, GhEventRepo repo, GhEventPayload payload) {
    }

    private final RestClient github;
    private final String user;
    private final int limit;
    private final Duration ttl;
    private final Clock clock;
    private final Object refreshLock = new Object();

    private volatile Activity cached;
    private volatile Instant cachedAt = Instant.EPOCH;

    @Autowired
    ActivityController(ApiProperties properties, Clock clock) {
        this(buildGithubClient(properties), properties.activityGithubUser(), properties.activityLimit(),
                properties.activityCacheTtl(), clock);
    }

    // Package-private: lets tests point this at a stub server instead of the real GitHub API.
    ActivityController(RestClient github, String user, int limit, Duration ttl, Clock clock) {
        this.github = github;
        this.user = user;
        this.limit = limit;
        this.ttl = ttl;
        this.clock = clock;
    }

    private static RestClient buildGithubClient(ApiProperties properties) {
        var requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(Duration.ofSeconds(5));
        requestFactory.setReadTimeout(Duration.ofSeconds(5));
        var builder = RestClient.builder()
                .baseUrl("https://api.github.com")
                .defaultHeader("Accept", "application/vnd.github+json")
                .requestFactory(requestFactory);
        String token = properties.activityGithubToken();
        if (token != null && !token.isBlank()) {
            builder.defaultHeader("Authorization", "Bearer " + token);
        }
        return builder.build();
    }

    @GetMapping("/api/activity")
    ResponseEntity<Activity> activity() {
        Activity fresh = freshEnough();
        if (fresh != null) {
            return ResponseEntity.ok(fresh);
        }
        synchronized (refreshLock) {
            fresh = freshEnough();
            if (fresh != null) {
                return ResponseEntity.ok(fresh);
            }
            Activity fetched = fetch();
            if (fetched != null) {
                cached = fetched;
                cachedAt = clock.instant();
                return ResponseEntity.ok(fetched);
            }
            // GitHub failed: a stale cached answer beats none, since the frontend's fallback is the far-less-fresh build-time snapshot.
            if (cached != null) {
                return ResponseEntity.ok(cached);
            }
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY).build();
        }
    }

    private Activity freshEnough() {
        Activity current = cached;
        if (current != null && clock.instant().isBefore(cachedAt.plus(ttl))) {
            return current;
        }
        return null;
    }

    private Activity fetch() {
        try {
            List<GhRepo> repos = github.get()
                    .uri("/users/{user}/repos?sort=pushed&direction=desc&per_page=30", user)
                    .retrieve()
                    .body(new ParameterizedTypeReference<List<GhRepo>>() {
                    });
            if (repos == null) {
                return null;
            }

            List<RepoActivity> result = repos.stream()
                    .filter(r -> !r.fork() && !r.archived())
                    .limit(limit)
                    .map(r -> new RepoActivity(r.name(), r.description(), r.htmlUrl(), r.pushedAt(), r.language(), null))
                    .toList();

            var counts = pushCounts();
            result = result.stream()
                    .map(r -> new RepoActivity(
                            r.name(), r.description(), r.url(), r.pushedAt(), r.language(), counts.get(r.name())))
                    .toList();

            return new Activity(Instant.now(clock).toString(), result);
        } catch (RestClientException e) {
            log.warn("github activity fetch failed", e);
            return null;
        }
    }

    private java.util.Map<String, Integer> pushCounts() {
        try {
            List<GhEvent> events = github.get()
                    .uri("/users/{user}/events/public?per_page=100", user)
                    .retrieve()
                    .body(new ParameterizedTypeReference<List<GhEvent>>() {
                    });
            var counts = new java.util.HashMap<String, Integer>();
            if (events == null) {
                return counts;
            }
            for (var e : events) {
                if (!"PushEvent".equals(e.type()) || e.repo() == null) {
                    continue;
                }
                String name = e.repo().name().contains("/")
                        ? e.repo().name().substring(e.repo().name().indexOf('/') + 1)
                        : e.repo().name();
                int size = e.payload() != null && e.payload().size() != null ? e.payload().size() : 0;
                counts.merge(name, size, Integer::sum);
            }
            return counts;
        } catch (RestClientException e) {
            // Repo list without commit counts is still useful; this half failing shouldn't sink the other.
            return java.util.Map.of();
        }
    }
}
