import React, { memo, useCallback } from "react";
import { TextField, InputAdornment, IconButton, Box } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";

interface NavbarSearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  placeholder?: string;
  disabled?: boolean;
  showOnlyOnHome?: boolean;
  isHomePage?: boolean;
}

export const NavbarSearchField: React.FC<NavbarSearchFieldProps> = memo(
  ({
    value,
    onChange,
    onClear,
    placeholder = "Buscar productos...",
    disabled = false,
    showOnlyOnHome = true,
    isHomePage = false,
  }) => {
    const handleChange = useCallback(
      (event: React.ChangeEvent<HTMLInputElement>) => {
        onChange(event.target.value);
      },
      [onChange]
    );

    const handleKeyDown = useCallback(
      (event: React.KeyboardEvent) => {
        if (event.key === "Escape") {
          onClear();
        }
      },
      [onClear]
    );

    const handleClear = useCallback(() => {
      onClear();
    }, [onClear]);

    if (showOnlyOnHome && !isHomePage) {
      return null;
    }

    return (
      <Box sx={{ flexGrow: 1, maxWidth: 400, mr: 2, justifySelf: "start" }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder={placeholder}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          size="small"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" fontSize="small" />
              </InputAdornment>
            ),
            endAdornment: value && (
              <InputAdornment position="end">
                <IconButton
                  aria-label="limpiar búsqueda"
                  onClick={handleClear}
                  edge="end"
                  size="small"
                >
                  <ClearIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ),
          }}
          sx={{
            "& .MuiOutlinedInput-root": {
              backgroundColor: "white",
              borderRadius: 2,
              "& fieldset": {
                borderColor: "rgba(0, 0, 0, 0.23)",
              },
              "&:hover fieldset": {
                borderColor: "primary.main",
              },
              "&.Mui-focused fieldset": {
                borderColor: "primary.main",
              },
            },
            "& .MuiInputBase-input": {
              padding: "8px 14px",
            },
          }}
        />
      </Box>
    );
  }
);

NavbarSearchField.displayName = "NavbarSearchField";
