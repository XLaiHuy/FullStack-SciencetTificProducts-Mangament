package com.nckh.backend;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest(properties = {
	"spring.datasource.url=jdbc:h2:mem:nckh_test;MODE=MySQL;DB_CLOSE_DELAY=-1;DATABASE_TO_UPPER=false",
	"spring.datasource.driver-class-name=org.h2.Driver",
	"spring.datasource.username=sa",
	"spring.datasource.password=",
	"spring.jpa.hibernate.ddl-auto=create-drop",
	"app.security.jwt.secret=0123456789abcdef0123456789abcdef",
	"app.security.jwt.access-expiration-ms=900000",
	"app.security.jwt.refresh-expiration-ms=604800000",
	"app.cors.allowed-origins=http://localhost:5173"
})
@ActiveProfiles("test")
class BackSpringApplicationTests {

	@Test
	void contextLoads() {
	}

}
