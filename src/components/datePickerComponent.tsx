import React, { useContext } from "react";
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { Box } from "@mui/system";
import { appContext } from "../appContext";

const DatePickerComponent: React.FC = () => {
    const { dateCTX } = useContext(appContext);
    const { selectedDate, setSelectedDate } = dateCTX;

    return (
        <Box display="flex" alignItems="center">
            <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                    label="Día de trabajo"
                    value={selectedDate}
                    onChange={(date) => setSelectedDate(date)}
                    format="dd/MM/yyyy"
                    slotProps={{
                        textField: {
                            fullWidth: true,
                            variant: "outlined",
                            style: { width: '200px', height: '40px', margin: '0 10px' }
                        },
                    }}
                />
            </LocalizationProvider>
        </Box>
    );
};

export default DatePickerComponent;