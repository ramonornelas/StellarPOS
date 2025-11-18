import React from "react";
import {
  Box,
  Button,
  IconButton,
  Typography,
  FormControl,
  Select,
  MenuItem,
  InputLabel,
  SelectChangeEvent,
} from "@mui/material";
import {
  FirstPage,
  LastPage,
  ChevronLeft,
  ChevronRight,
} from "@mui/icons-material";

interface NumberedPaginationProps {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  pageSizeOptions?: number[];
  disabled?: boolean;
}

const NumberedPagination: React.FC<NumberedPaginationProps> = ({
  currentPage,
  totalPages,
  totalCount,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [25, 50, 100],
  disabled = false,
}) => {
  // Calculate visible page numbers
  const getVisiblePages = () => {
    const maxVisible = 7; // Maximum number of page buttons to show
    const pages: (number | string)[] = [];

    if (totalPages <= maxVisible) {
      // If total pages is small, show all
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Complex logic for showing pages with ellipsis
      const startPage = Math.max(1, currentPage - 2);
      const endPage = Math.min(totalPages, currentPage + 2);

      if (startPage > 1) {
        pages.push(1);
        if (startPage > 2) {
          pages.push("...");
        }
      }

      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }

      if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
          pages.push("...");
        }
        pages.push(totalPages);
      }
    }

    return pages;
  };

  const visiblePages = getVisiblePages();

  // Calculate display range
  const from = totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const to = Math.min(currentPage * pageSize, totalCount);

  const handlePageSizeChange = (event: SelectChangeEvent<number>) => {
    onPageSizeChange(Number(event.target.value));
  };

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 2,
        p: 2,
        borderTop: 1,
        borderColor: "divider",
      }}
    >
      {/* Rows per page selector */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Filas por página</InputLabel>
          <Select
            value={pageSize}
            label="Filas por página"
            onChange={handlePageSizeChange}
            disabled={disabled}
          >
            {pageSizeOptions.map((option) => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {/* Page info and navigation */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
        {/* Results info */}
        <Typography variant="body2" color="text.secondary">
          {`${from}-${to} de ${
            totalCount !== -1 ? totalCount : `más de ${to}`
          }`}
        </Typography>

        {/* Page navigation */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          {/* First page */}
          <IconButton
            onClick={() => onPageChange(1)}
            disabled={disabled || currentPage === 1}
            size="small"
            title="Primera página"
          >
            <FirstPage />
          </IconButton>

          {/* Previous page */}
          <IconButton
            onClick={() => onPageChange(currentPage - 1)}
            disabled={disabled || currentPage === 1}
            size="small"
            title="Página anterior"
          >
            <ChevronLeft />
          </IconButton>

          {/* Page numbers */}
          {visiblePages.map((page, index) => (
            <React.Fragment key={index}>
              {page === "..." ? (
                <Typography
                  variant="body2"
                  sx={{ px: 1, color: "text.secondary" }}
                >
                  ...
                </Typography>
              ) : (
                <Button
                  variant={page === currentPage ? "contained" : "text"}
                  size="small"
                  onClick={() => onPageChange(page as number)}
                  disabled={disabled}
                  sx={{
                    minWidth: 36,
                    height: 36,
                    fontSize: "0.875rem",
                    ...(page === currentPage && {
                      fontWeight: "bold",
                    }),
                  }}
                >
                  {page}
                </Button>
              )}
            </React.Fragment>
          ))}

          {/* Next page */}
          <IconButton
            onClick={() => onPageChange(currentPage + 1)}
            disabled={disabled || currentPage === totalPages}
            size="small"
            title="Página siguiente"
          >
            <ChevronRight />
          </IconButton>

          {/* Last page */}
          <IconButton
            onClick={() => onPageChange(totalPages)}
            disabled={disabled || currentPage === totalPages}
            size="small"
            title="Última página"
          >
            <LastPage />
          </IconButton>
        </Box>
      </Box>
    </Box>
  );
};

export default NumberedPagination;
