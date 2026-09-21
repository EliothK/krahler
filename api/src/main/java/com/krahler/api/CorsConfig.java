package com.krahler.api;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/** The site is served from a different origin than the API, so the browser needs explicit permission. */
@Configuration
class CorsConfig {

    @Bean
    WebMvcConfigurer corsConfigurer(ApiProperties properties) {
        return new WebMvcConfigurer() {
            @Override
            public void addCorsMappings(CorsRegistry registry) {
                registry.addMapping("/api/**")
                        .allowedOrigins(properties.allowedOrigins().toArray(String[]::new))
                        .allowedMethods("GET", "POST")
                        .maxAge(3600);
            }
        };
    }
}
