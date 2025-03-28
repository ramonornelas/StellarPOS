export const fetchAIResponse = async (user_query: string): Promise<string> => {
    const endpoint = "https://5587bci5v1.execute-api.us-east-1.amazonaws.com/";

    try {
        const response = await fetch(endpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ user_query }),
        });

        if (!response.ok) {
            throw new Error(`Error: ${response.status}`);
        }

        const data = await response.json();
        return data.response || "No se recibió respuesta de la IA.";
    } catch (error) {
        console.error("Error al comunicarse con el endpoint:", error);
        return "Hubo un error al obtener la respuesta de la IA.";
    }
};