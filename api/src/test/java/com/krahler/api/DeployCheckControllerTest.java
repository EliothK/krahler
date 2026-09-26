package com.krahler.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.Test;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.http.HttpStatus;

class DeployCheckControllerTest {

    private final LazySchemaMigrator schema = mock(LazySchemaMigrator.class);
    private final ContactMessageRepository messages = mock(ContactMessageRepository.class);

    @Test
    void answers404AndNeverTouchesTheDatabaseWithoutTheRightToken() {
        var controller = new DeployCheckController("s3cret", schema, messages);

        assertThat(controller.check(null).getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(controller.check("").getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(controller.check("wrong").getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(controller.check("s3cret-and-more").getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        verifyNoInteractions(schema, messages);
    }

    @Test
    void isDisabledWhenNoTokenIsConfigured() {
        var controller = new DeployCheckController("", schema, messages);

        assertThat(controller.check("").getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(controller.check("anything").getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        verifyNoInteractions(schema, messages);
    }

    @Test
    void migratesAndQueriesWithTheRightToken() {
        when(messages.count()).thenReturn(3L);
        var controller = new DeployCheckController("s3cret", schema, messages);

        var response = controller.check("s3cret");

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).containsEntry("database", "ok");
        verify(schema).ensureMigrated();
        verify(messages).count();
    }

    @Test
    void answers503WhenTheMigrationFails() {
        doThrow(new IllegalStateException("login failed")).when(schema).ensureMigrated();
        var controller = new DeployCheckController("s3cret", schema, messages);

        var response = controller.check("s3cret");

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.SERVICE_UNAVAILABLE);
        assertThat(response.getBody()).containsEntry("database", "unreachable");
        verify(messages, never()).count();
    }

    @Test
    void answers503WhenTheQueryFails() {
        when(messages.count()).thenThrow(new DataAccessResourceFailureException("connection refused"));
        var controller = new DeployCheckController("s3cret", schema, messages);

        assertThat(controller.check("s3cret").getStatusCode()).isEqualTo(HttpStatus.SERVICE_UNAVAILABLE);
    }
}
