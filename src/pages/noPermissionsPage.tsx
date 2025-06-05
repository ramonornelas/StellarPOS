import { logoff } from "../utils/logoff";

export const NoPermissionsPage = () => {
    return (
        <div style={{ padding: "2rem", textAlign: "center" }}>
            <h2>No tiene permisos asignados</h2>
            <p>
                Por favor, contacte a su administrador para que le otorgue acceso antes de usar el sistema.
            </p>
            <button
                style={{
                    marginTop: "2rem",
                    padding: "0.75rem 2rem",
                    fontSize: "1rem",
                    background: "#e53935",
                    color: "#fff",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer"
                }}
                onClick={logoff}
            >
                Salir
            </button>
        </div>
    );
};