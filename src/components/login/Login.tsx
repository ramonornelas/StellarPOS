import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./Login.module.css";

interface LoginProps {
    onLoginSuccess: () => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const navigate = useNavigate(); // Hook to navigate between routes

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const response = await fetch('https://iupws50sa8.execute-api.us-west-1.amazonaws.com/auth/login', {
                method: 'POST',
                headers: {
                    "Accept": "application/json",
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ username: email, password }),
            });

            if (response.status === 200) {
                const searchUserResponse = await fetch('https://iupws50sa8.execute-api.us-west-1.amazonaws.com/users/search', {
                    method: 'POST',
                    headers: {
                        "Accept": "application/json",
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ username: email }),
                });

                if (searchUserResponse.status === 200) {
                    const searchUserData = await searchUserResponse.json();
                    const searchUserId = searchUserData[0].id;
                    const searchUsername = searchUserData[0].username;

                    sessionStorage.setItem("stellar_userid", searchUserId);
                    sessionStorage.setItem("stellar_username", searchUsername);

                    // Notify App.tsx of successful login
                    onLoginSuccess();

                    // Redirect to the root "/"
                    navigate("/");
                } else {
                    throw new Error('Failed to fetch user data');
                }
            } else {
                throw new Error('Failed to log in');
            }
        } catch (error: any) {
            console.error('Error:', error);
            setError(error.message);
        }
    };

    return (
        <div className={styles.loginContainer}>
            <h2>Login</h2>
            {error && <div className={styles.error}>{error}</div>}
            <form onSubmit={handleSubmit} className={styles.loginForm}>
                <div className={styles.inputGroup}>
                    <label htmlFor="email">Email:</label>
                    <input
                        type="email"
                        id="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
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
                <button type="submit" className={styles.loginButton}>Login</button>
            </form>
            <p className={styles.registerPrompt}>
                Don't have an account? <a href="/registeruser">Register here</a>
            </p>
        </div>
    );
};

export default Login;