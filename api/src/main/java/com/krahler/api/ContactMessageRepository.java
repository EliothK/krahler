package com.krahler.api;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

interface ContactMessageRepository extends JpaRepository<ContactMessage, Long> {

    List<ContactMessage> findByEmailedFalse();
}
