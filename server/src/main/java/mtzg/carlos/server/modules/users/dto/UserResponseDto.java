package mtzg.carlos.server.modules.users.dto;

import java.util.List;
import java.util.UUID;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import mtzg.carlos.server.modules.stores.dto.StoreResponseDto;

@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class UserResponseDto {

    private UUID uuid;
    private String name;
    private String email;
    private List<StoreResponseDto> stores;
}
