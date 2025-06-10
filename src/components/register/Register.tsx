import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "../login/login.module.css";

const Register: React.FC = () => {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [phoneNumber, setPhoneNumber] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const navigate = useNavigate(); // Hook to navigate between routes

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            setError("Las contraseñas no coinciden");
            return;
        }

        try {
            // Calculate expiration_date as one year from today
            const today = new Date();
            const nextYear = new Date(today);
            nextYear.setFullYear(today.getFullYear() + 1); // Add 1 year
            const expirationDate = nextYear.toISOString().split("T")[0]; // Format as yyyy-mm-dd

            const response = await fetch("https://iupws50sa8.execute-api.us-west-1.amazonaws.com/users", {
                method: "POST",
                headers: {
                    "Accept": "application/json",
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    username,
                    password,
                    phone_number: phoneNumber || undefined,
                    active: true,
                    expiration_date: expirationDate, // Use the calculated expiration date
                }),
            });

            if (response.status === 201) {
                setSuccess("¡Usuario registrado exitosamente!");
                setError("");
                setUsername("");
                setPassword("");
                setConfirmPassword("");
                setPhoneNumber("");
            } else {
                const errorData = await response.json();
                throw new Error(errorData.message || "No se pudo registrar el usuario");
            }
        } catch (err: any) {
            console.error("Error:", err);
            setError(err.message);
            setSuccess("");
        }
    };

    return (
        <div className={styles.loginContainer}>
            <h2>Registro</h2>
            {error && <div className={styles.error}>{error}</div>}
            {success && (
                <div className={styles.success}>
                    {success}
                    <button
                        className={styles.backToLoginButton}
                        onClick={() => navigate("/login")}
                    >
                        Volver al inicio de sesión
                    </button>
                </div>
            )}
            <form onSubmit={handleSubmit} className={styles.loginForm}>
                <div className={styles.inputGroup}>
                    <label htmlFor="username">Correo electrónico:</label>
                    <input
                        type="email"
                        id="username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                    />
                </div>
                <div className={styles.inputGroup}>
                    <label htmlFor="password">Contraseña:</label>
                    <input
                        type="password"
                        id="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </div>
                <div className={styles.inputGroup}>
                    <label htmlFor="confirmPassword">Confirmar contraseña:</label>
                    <input
                        type="password"
                        id="confirmPassword"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                    />
                </div>
                <div className={styles.inputGroup}>
                    <label htmlFor="phoneNumber">Teléfono (opcional):</label>
                    <input
                        type="text"
                        id="phoneNumber"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                    />
                </div>
                <button type="submit" className={styles.loginButton}>Registrarse</button>
            </form>
            {/* Enlace menos prominente para volver al login */}
            {!success && (
                <div style={{ textAlign: "center", marginTop: "1rem" }}>
                    <span
                        style={{
                            fontSize: "0.9rem",
                            color: "#888",
                            cursor: "pointer",
                            textDecoration: "underline"
                        }}
                        onClick={() => navigate("/login")}
                    >
                        ¿Ya tienes cuenta? Inicia sesión
                    </span>
                </div>
            )}
        </div>
    );
};

export default Register;