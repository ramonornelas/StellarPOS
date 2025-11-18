import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { render } from "./test-utils";
import Login from "../components/login/login";

/**
 * Test unitario
 */
describe("Login Component", () => {
  const mockOnLoginSuccess = vi.fn();

  it("debe renderizar el componente sin errores", () => {
    // Arrange: Preparar el componente
    render(<Login onLoginSuccess={mockOnLoginSuccess} />);

    // Assert: Verificar que se renderiza correctamente
    expect(screen.getByRole("heading")).toBeInTheDocument();
    // Use getByRole instead of getByText to avoid ambiguity
    expect(
      screen.getByRole("heading", { name: /iniciar sesión/i })
    ).toBeInTheDocument();
  });

  it("debe tener los campos de entrada requeridos", () => {
    // Arrange: Renderizar el componente
    render(<Login onLoginSuccess={mockOnLoginSuccess} />);

    // Act: Buscar los elementos del formulario
    const emailField = screen.getByLabelText(/correo electrónico/i);
    const passwordField = screen.getByLabelText(/contraseña/i);
    const submitButton = screen.getByRole("button", {
      name: /iniciar sesión/i,
    });

    // Assert: Verificar que existen y tienen las propiedades correctas
    expect(emailField).toBeInTheDocument();
    expect(emailField).toHaveAttribute("type", "email");
    expect(emailField).toBeRequired();

    expect(passwordField).toBeInTheDocument();
    expect(passwordField).toHaveAttribute("type", "password");
    expect(passwordField).toBeRequired();

    expect(submitButton).toBeInTheDocument();
    expect(submitButton).toHaveAttribute("type", "submit");
  });

  it("debe permitir escribir en los campos de entrada", async () => {
    // Arrange: Configurar el user event y renderizar
    const user = userEvent.setup();
    render(<Login onLoginSuccess={mockOnLoginSuccess} />);

    // Act: Interactuar con los campos
    const emailField = screen.getByLabelText(
      /correo electrónico/i
    ) as HTMLInputElement;
    const passwordField = screen.getByLabelText(
      /contraseña/i
    ) as HTMLInputElement;

    await user.type(emailField, "test@example.com");
    await user.type(passwordField, "mypassword");

    // Assert: Verificar que los valores se actualizaron
    expect(emailField.value).toBe("test@example.com");
    expect(passwordField.value).toBe("mypassword");
  });

  it("debe mostrar el enlace de registro", () => {
    // Arrange: Renderizar el componente
    render(<Login onLoginSuccess={mockOnLoginSuccess} />);

    // Act: Buscar el enlace de registro
    const registerLink = screen.getByRole("link", { name: /regístrate aquí/i });

    // Assert: Verificar que el enlace existe y apunta a la ruta correcta
    expect(registerLink).toBeInTheDocument();
    expect(registerLink).toHaveAttribute("href", "/registeruser");
  });

  it("debe limpiar los campos cuando se borra el contenido", async () => {
    // Arrange: Configurar el test
    const user = userEvent.setup();
    render(<Login onLoginSuccess={mockOnLoginSuccess} />);

    const emailField = screen.getByLabelText(
      /correo electrónico/i
    ) as HTMLInputElement;

    // Act: Escribir y luego limpiar
    await user.type(emailField, "test@example.com");
    expect(emailField.value).toBe("test@example.com"); // Verificar que se escribió

    await user.clear(emailField);

    // Assert: Verificar que se limpió
    expect(emailField.value).toBe("");
  });
});
