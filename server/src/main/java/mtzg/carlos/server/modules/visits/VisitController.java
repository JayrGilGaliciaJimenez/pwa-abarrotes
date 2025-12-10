package mtzg.carlos.server.modules.visits;

import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import jakarta.validation.constraints.NotBlank;
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

    @PostMapping("")
    public ResponseEntity<Object> registerVisit(
            @RequestParam("userUuid") UUID userUuid,
            @RequestParam("storeUuid") UUID storeUuid,
            @RequestParam("validation") boolean validation,
            @RequestParam("ordersJson") @NotBlank(message = "ordersJson cannot be blank") String ordersJson,
            @RequestParam("photo") MultipartFile photo) {
        return visitService.registerVisit(userUuid, storeUuid, validation, ordersJson, photo);
    }

    @DeleteMapping("/{uuid}")
    public ResponseEntity<Object> deleteVisit(@PathVariable("uuid") UUID uuid) {
        return visitService.deleteVisit(uuid);
    }
}
