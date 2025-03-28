import React, { useState, useRef, useEffect } from "react";
import { fetchAIResponse } from "../services/aiService";

export const ChatPage: React.FC = () => {
    const [messages, setMessages] = useState<{ user: string; bot: string }[]>([]);
    const [input, setInput] = useState("");
    const messagesEndRef = useRef<HTMLDivElement | null>(null);

    // Función para desplazar el área de mensajes hacia abajo
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Función para formatear la respuesta del bot
    const formatBotResponse = (response: string): string => {
        // Reemplaza los dobles saltos de línea (\n\n) por un solo salto de línea (\n)
        let formattedResponse = response.replace(/\n\n/g, "\n");

        // Siempre inicia la respuesta con saltos de línea

        formattedResponse = "\n" + formattedResponse;

        // Reemplaza los asteriscos dobles por etiquetas <strong>
        formattedResponse = formattedResponse.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

        // Reemplaza los saltos de línea (\n) por etiquetas <br />
        formattedResponse = formattedResponse.replace(/\n/g, "<br />");

        // Opcional: Formato adicional si es necesario
        const regex = /\*\*Nombre del producto:\*\* (.*?) - \*\*Precio:\*\* (.*?) - \*\*Explicación:\*\* (.*)/;
        const match = formattedResponse.match(regex);

        if (match) {
            const [, productName, price, explanation] = match;
            return `
                <p>Producto: <strong>${productName}</strong></p>
                <p>Precio: <strong>${price}</strong></p>
                <p>Explicación: ${explanation}</p>
            `;
        }

        return formattedResponse; // Si no coincide, devuelve la respuesta con negritas y saltos de línea
    };

    const handleSendMessage = async () => {
        if (!input.trim()) return;

        const userMessage = input;
        setMessages([...messages, { user: userMessage, bot: "" }]);
        setInput("");

        try {
            const botResponse = await fetchAIResponse(userMessage);
            const formattedResponse = formatBotResponse(botResponse);
            setMessages((prevMessages) =>
                prevMessages.map((msg, index) =>
                    index === prevMessages.length - 1 ? { ...msg, bot: formattedResponse } : msg
                )
            );
        } catch (error) {
            console.error("Error fetching AI response:", error);
        }
    };

    return (
        <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <h1>Chat con PadreyIA</h1>
                <h5>de StellarSmart</h5>
            </div>
            <div style={{ border: "1px solid #ccc", padding: "10px", height: "400px", overflowY: "scroll" }}>
                {messages.map((message, index) => (
                    <div key={index}>
                        <p><strong>Cliente:</strong> {message.user}</p>
                        <p><strong>PadreyIA:</strong> <span dangerouslySetInnerHTML={{ __html: message.bot || "..." }} /></p>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>
            <div style={{ marginTop: "10px" }}>
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") {
                            handleSendMessage();
                        }
                    }}
                    placeholder="Escribe tu mensaje..."
                    style={{ width: "70%", padding: "5px" }}
                />
                <button
                    onClick={handleSendMessage}
                    style={{
                        padding: "5px 10px",
                        marginLeft: "5px",
                        backgroundColor: "#007BFF", // Azul
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                    }}
                >
                    Enviar
                </button>
                <button
                    onClick={() => setMessages([])} // Limpia el chat al hacer clic
                    style={{
                        padding: "5px 10px",
                        marginLeft: "5px",
                        backgroundColor: "#f44336", // Rojo
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                    }}
                >
                    Reiniciar Chat
                </button>
            </div>
        </div>
    );
};