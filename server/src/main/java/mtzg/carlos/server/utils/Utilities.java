package mtzg.carlos.server.utils;

import java.util.Date;
import java.util.HashMap;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

public class Utilities {
    private Utilities() {
        throw new UnsupportedOperationException("Utility class");
    }

    public static ResponseEntity<Object> simpleResponse(HttpStatus status, String message) {
        Map<String, Object> map = new HashMap<>();
        map.put("date", new Date());
        map.put("status", status.value());
        map.put("message", message);
        return new ResponseEntity<>(map, status);
    }

    public static ResponseEntity<Object> authResponse(HttpStatus status, String message, String token) {
        Map<String, Object> map = new HashMap<>();
        map.put("date", new Date());
        map.put("status", status.value());
        map.put("message", message);
        map.put("token", token);
        return new ResponseEntity<>(map, status);
    }
}
