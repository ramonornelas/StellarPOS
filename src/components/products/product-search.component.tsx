import React, { useState, useEffect } from "react";
import { Button } from "@mui/material";
import BarcodeScannerComponent from "react-qr-barcode-scanner";

interface ProductSearchProps {
    onScan: (code: string) => void;
}

export const ProductSearch: React.FC<ProductSearchProps> = ({ onScan }) => {
    const [showScanner, setShowScanner] = useState(false);
    const [scannedCode, setScannedCode] = useState("");

    useEffect(() => {
        if (scannedCode) {
            console.log("Scanned code:", scannedCode);
        }
    }, [scannedCode]);

    const handleScan = (err: unknown, result: any) => {
        if (err) {
            console.error("Error scanning barcode:", err);
            return;
        }
        if (result?.text) {
            setScannedCode(result.text);
            onScan(result.text);
        }
    };

    const handleScanBarcode = () => {
        setShowScanner(!showScanner);
    };

    return (
        <div>
            {showScanner && (
                <BarcodeScannerComponent width={300} height={200} onUpdate={handleScan} />
            )}
            <p>
                <Button variant="contained" color="primary" onClick={handleScanBarcode}>
                    {showScanner ? "Ocultar escáner" : "Leer código de barras"}
                </Button>
            </p>
        </div>
    );
};