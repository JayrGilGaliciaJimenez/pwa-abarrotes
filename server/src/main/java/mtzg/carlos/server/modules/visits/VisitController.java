package mtzg.carlos.server.modules.visits;

import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v1/visits")
@RequiredArgsConstructor
public class VisitController {

    private final VisitService visitService;

    @GetMapping("")
    public ResponseEntity<Object> getAllVisits() {
        return visitService.getAllVisits();
    }

    @GetMapping("/{uuid}")
    public ResponseEntity<Object> getVisitByUuid(@PathVariable("uuid") UUID uuid) {
        return visitService.getVisitByUuid(uuid);
    }
}
