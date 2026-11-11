export async function mensajeDeError(respuesta: Response, porDefecto: string): Promise<string> {
    try {
        const cuerpo = await respuesta.json();
        return typeof cuerpo?.detail === 'string' ? cuerpo.detail : porDefecto;
    } catch {
        return porDefecto;
    }
}
