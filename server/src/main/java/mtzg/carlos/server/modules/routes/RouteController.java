package mtzg.carlos.server.modules.routes;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import mtzg.carlos.server.modules.routes.dto.RouteRequestDto;

@RestController
@RequestMapping("/api/v1/routes")
@RequiredArgsConstructor
public class RouteController {

    private final RouteService routeService;

    @PostMapping("/assign")
    public ResponseEntity<Object> assignStoreToUser(@RequestBody @Valid RouteRequestDto request) {
        return routeService.assignStoreToUser(request);
    }
}
