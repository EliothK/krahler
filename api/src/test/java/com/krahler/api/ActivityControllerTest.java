package com.krahler.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withServerError;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;

import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

class ActivityControllerTest {

    private static final String REPOS_JSON = """
            [
              {"name":"repo-a","description":"desc a","html_url":"https://github.com/u/repo-a",
               "pushed_at":"2026-09-20T00:00:00Z","language":"TypeScript","fork":false,"archived":false},
              {"name":"forked","description":null,"html_url":"https://github.com/u/forked",
               "pushed_at":"2026-09-20T00:00:00Z","language":null,"fork":true,"archived":false}
            ]""";

    private static final String EVENTS_JSON = """
            [{"type":"PushEvent","repo":{"name":"u/repo-a"},"payload":{"size":3}}]""";

    private RestClient.Builder clientBuilder() {
        return RestClient.builder().baseUrl("https://api.github.com");
    }

    @Test
    void filtersForksAndAttachesCommitCounts() {
        var builder = clientBuilder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        server.expect(requestTo("https://api.github.com/users/EliothK/repos?sort=pushed&direction=desc&per_page=30"))
                .andRespond(withSuccess(REPOS_JSON, MediaType.APPLICATION_JSON));
        server.expect(requestTo("https://api.github.com/users/EliothK/events/public?per_page=100"))
                .andRespond(withSuccess(EVENTS_JSON, MediaType.APPLICATION_JSON));

        var controller = new ActivityController(builder.build(), "EliothK", 5, Duration.ofMinutes(10), Clock.systemUTC());

        var response = controller.activity();

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        var body = response.getBody();
        assertThat(body).isNotNull();
        assertThat(body.repos()).hasSize(1);
        assertThat(body.repos().get(0).name()).isEqualTo("repo-a");
        assertThat(body.repos().get(0).commits()).isEqualTo(3);
        server.verify();
    }

    @Test
    void reusesTheCachedAnswerWithinTheTtl() {
        var builder = clientBuilder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        server.expect(requestTo("https://api.github.com/users/EliothK/repos?sort=pushed&direction=desc&per_page=30"))
                .andRespond(withSuccess(REPOS_JSON, MediaType.APPLICATION_JSON));
        server.expect(requestTo("https://api.github.com/users/EliothK/events/public?per_page=100"))
                .andRespond(withSuccess(EVENTS_JSON, MediaType.APPLICATION_JSON));

        var controller = new ActivityController(builder.build(), "EliothK", 5, Duration.ofMinutes(10), Clock.systemUTC());

        controller.activity();
        // A second call within the TTL must not hit the mock server again: only two expectations were set above.
        var second = controller.activity();

        assertThat(second.getBody()).isNotNull();
        server.verify();
    }

    @Test
    void servesTheStaleCacheWhenGithubFails() {
        var builder = clientBuilder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        server.expect(requestTo("https://api.github.com/users/EliothK/repos?sort=pushed&direction=desc&per_page=30"))
                .andRespond(withSuccess(REPOS_JSON, MediaType.APPLICATION_JSON));
        server.expect(requestTo("https://api.github.com/users/EliothK/events/public?per_page=100"))
                .andRespond(withSuccess(EVENTS_JSON, MediaType.APPLICATION_JSON));
        server.expect(requestTo("https://api.github.com/users/EliothK/repos?sort=pushed&direction=desc&per_page=30"))
                .andRespond(withServerError());

        Instant t0 = Instant.parse("2026-09-22T00:00:00Z");
        var mutableClock = new MutableClock(t0);
        var controller = new ActivityController(builder.build(), "EliothK", 5, Duration.ofMinutes(10), mutableClock);
        controller.activity();

        // Move past the TTL so the next call re-hits GitHub, which is set up above to fail this time.
        mutableClock.instant = t0.plus(Duration.ofMinutes(11));

        var response = controller.activity();

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody().repos()).hasSize(1);
    }

    @Test
    void returnsBadGatewayWhenGithubFailsAndThereIsNoCache() {
        var builder = clientBuilder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        server.expect(requestTo("https://api.github.com/users/EliothK/repos?sort=pushed&direction=desc&per_page=30"))
                .andRespond(withServerError());

        var controller = new ActivityController(builder.build(), "EliothK", 5, Duration.ofMinutes(10), Clock.systemUTC());

        var response = controller.activity();

        assertThat(response.getStatusCode().value()).isEqualTo(502);
    }

    private static final class MutableClock extends Clock {
        private Instant instant;

        private MutableClock(Instant instant) {
            this.instant = instant;
        }

        @Override
        public java.time.ZoneId getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(java.time.ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return instant;
        }
    }
}
