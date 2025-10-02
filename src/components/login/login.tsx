import React, { useState } from "react";
import { postLogin, searchUser } from "../../functions/apiFunctions";
import { useNavigate } from "react-router-dom";
import styles from "./login.module.css";
import { Typography } from "@mui/material";

interface LoginProps {
  onLoginSuccess: () => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate(); // Hook to navigate between routes

  const getRouteFromHomeScreen = (homeScreen: string): string => {
    const routeMapping: Record<string, string> = {
      home: "/",
      orders: "/orders",
      cashRegisterHistoryPage: "/cash-register-history",
    };

    return routeMapping[homeScreen] || "/";
  };

  const ENV_STAGE = import.meta.env.VITE_API_STAGE;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await postLogin(email, password);
      if (response.status === 200) {
        const searchUserResponse = await searchUser(email);
        if (searchUserResponse.status === 200) {
          const searchUserData = await searchUserResponse.json();
          console.log("searchUserData:", searchUserData);

          if (!searchUserData[0].active) {
            setError("Usuario inactivo. Contacta al administrador.");
            return;
          }

          const searchUserId = searchUserData[0].id;
          const searchUsername = searchUserData[0].username;
          const userHomeScreen = searchUserData[0].home_screen;

          sessionStorage.setItem("stellar_userid", searchUserId);
          sessionStorage.setItem("stellar_username", searchUsername);
          sessionStorage.setItem("stellar_role", searchUserData[0].role_id);
          sessionStorage.setItem(
            "stellar_role_name",
            searchUserData[0].role_name
          );
          onLoginSuccess();
          const targetRoute = getRouteFromHomeScreen(userHomeScreen);

          navigate(targetRoute);
        } else {
          throw new Error("No se pudo obtener la información del usuario");
        }
      } else {
        throw new Error("No se pudo iniciar sesión");
      }
    } catch (error: any) {
      console.error("Error:", error);
      setError(
        "No se pudo iniciar sesión. Por favor verifica tu información e inténtalo de nuevo."
      );
    }
  };

  return (
    <div className={styles.loginContainer}>
      {ENV_STAGE !== "PROD" && ENV_STAGE && (
        <Typography
          variant="caption"
          sx={{
            ml: 2,
            color: "grey.600",
            fontWeight: 500,
            letterSpacing: 1,
            bgcolor: "grey.100",
            px: 1.5,
            py: 0.5,
            borderRadius: 1,
            alignSelf: "center",
            userSelect: "none",
          }}
        >
          {ENV_STAGE} ENV
        </Typography>
      )}
      <h2>Iniciar sesión</h2>
      {error && <div className={styles.error}>{error}</div>}
      <form onSubmit={handleSubmit} className={styles.loginForm}>
        <div className={styles.inputGroup}>
          <label htmlFor="email">Correo electrónico:</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
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
        <button type="submit" className={styles.loginButton}>
          Iniciar sesión
        </button>
      </form>
      <p className={styles.registerPrompt}>
        ¿No tienes una cuenta? <a href="/registeruser">Regístrate aquí</a>
      </p>
    </div>
  );
};

export default Login;
