import React, { useState, useRef, useEffect } from "react";
import { fetchAIResponse } from "../services/aiService";
import { FiMessageSquare } from "react-icons/fi";

export const ChatPage: React.FC = () => {
    const [messages, setMessages] = useState<{ user: string; bot: string }[]>([]);
    const [input, setInput] = useState("");
    const messagesEndRef = useRef<HTMLDivElement | null>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const formatBotResponse = (response: string): string => {
        let formattedResponse = response.replace(/\n\n/g, "\n");
        formattedResponse = "\n" + formattedResponse;
        formattedResponse = formattedResponse.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
        formattedResponse = formattedResponse.replace(/\n/g, "<br />");

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

        return formattedResponse;
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
            <div style={{ display: "flex", alignItems: "center", gap: "10px", paddingBottom: "2px" }}>
                <h1>&nbsp;Chat con PadreyIA</h1>
                <h5>de StellarSmart&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</h5>
                <button
                    onClick={() => setMessages([])}
                    style={{
                        padding: "5px 10px",
                        backgroundColor: "transparent",
                        color: "#1e67b0",
                        border: "none",
                        borderRadius: "4px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "5px",
                        cursor: "pointer",
                        transition: "transform 0.2s ease",
                    }}
                    onMouseOver={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.1)";
                    }}
                    onMouseOut={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
                    }}
                >
                    <FiMessageSquare size={20} />
                    <span>Nuevo chat</span>
                </button>
            </div>
            <div style={{ border: "1px solid #ccc", padding: "10px", height: "250px", overflowY: "scroll", marginBottom: "10px" }}>
                {messages.map((message, index) => (
                    <div key={index}>
                        <p><strong>Cliente:</strong> {message.user}</p>
                        <p><strong>PadreyIA:</strong> <span dangerouslySetInnerHTML={{ __html: message.bot || "..." }} /></p>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>
            <div
                style={{
                    marginTop: "40px",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    gap: "10px",
                    position: "relative",
                    top: "-20px",
                }}
            >
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
                    style={{
                        width: "60%",
                        padding: "10px",
                        borderRadius: "4px",
                        border: "1px solid #ccc",
                    }}
                />
                <button
                    onClick={handleSendMessage}
                    style={{
                        padding: "10px 15px",
                        backgroundColor: "#007BFF",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                    }}
                >
                    Enviar
                </button>
            </div>
        </div>
    );
};