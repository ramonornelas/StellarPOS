import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "../login/Login.module.css";

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
            setError("Passwords do not match");
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
                setSuccess("User registered successfully!");
                setError("");
                setUsername("");
                setPassword("");
                setConfirmPassword("");
                setPhoneNumber("");
            } else {
                const errorData = await response.json();
                throw new Error(errorData.message || "Failed to register user");
            }
        } catch (err: any) {
            console.error("Error:", err);
            setError(err.message);
            setSuccess("");
        }
    };

    return (
        <div className={styles.loginContainer}>
            <h2>Register</h2>
            {error && <div className={styles.error}>{error}</div>}
            {success && (
                <div className={styles.success}>
                    {success}
                    <button
                        className={styles.backToLoginButton}
                        onClick={() => navigate("/login")}
                    >
                        Back to Login
                    </button>
                </div>
            )}
            <form onSubmit={handleSubmit} className={styles.loginForm}>
                <div className={styles.inputGroup}>
                    <label htmlFor="username">Email:</label>
                    <input
                        type="email"
                        id="username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                    />
                </div>
                <div className={styles.inputGroup}>
                    <label htmlFor="password">Password:</label>
                    <input
                        type="password"
                        id="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </div>
                <div className={styles.inputGroup}>
                    <label htmlFor="confirmPassword">Confirm Password:</label>
                    <input
                        type="password"
                        id="confirmPassword"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                    />
                </div>
                <div className={styles.inputGroup}>
                    <label htmlFor="phoneNumber">Phone Number (Optional):</label>
                    <input
                        type="text"
                        id="phoneNumber"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                    />
                </div>
                <button type="submit" className={styles.loginButton}>Register</button>
            </form>
        </div>
    );
};

export default Register;