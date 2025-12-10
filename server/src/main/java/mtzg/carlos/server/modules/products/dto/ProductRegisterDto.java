package mtzg.carlos.server.modules.products.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class ProductRegisterDto {

    public static final String NO_ANGLE_BRACKETS_MESSAGE = "must not contain angle brackets";
    public static final String NO_ANGLE_BRACKETS_REGEX = "^[^<>]*$";

    @NotBlank(message = "Name is required")
    @Pattern(regexp = NO_ANGLE_BRACKETS_REGEX, message = NO_ANGLE_BRACKETS_MESSAGE)
    private String name;

    @NotBlank(message = "Description is required")
    @Pattern(regexp = NO_ANGLE_BRACKETS_REGEX, message = NO_ANGLE_BRACKETS_MESSAGE)
    private String description;

    @NotNull(message = "Base price is required")
    @Min(value = 1, message = "Base price must be non-negative and greater than zero")
    private double basePrice;

    public void setName(String name) {
        this.name = name != null ? name.trim() : null;
    }

    public void setDescription(String description) {
        this.description = description != null ? description.trim() : null;
    }

}
