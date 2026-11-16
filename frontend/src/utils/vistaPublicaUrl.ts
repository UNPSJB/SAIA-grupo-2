const HOSTS_LOCALES = ['localhost', '127.0.0.1', '[::1]'];

export function abiertoDesdeEstaPc(): boolean {
    return HOSTS_LOCALES.includes(window.location.hostname);
}

export function direccionesDeRed(): string[] {
    const valor: string = import.meta.env.VITE_DIRECCIONES_RED ?? '';
    return valor.split(',').filter(Boolean);
}

export function origenPublico(direccion: string | null): string {
    if (!abiertoDesdeEstaPc() || !direccion) return window.location.origin;
    const puerto = window.location.port ? `:${window.location.port}` : '';
    return `${window.location.protocol}//${direccion}${puerto}`;
}

export function urlVistaPublica(token: string, direccion: string | null): string {
    return `${origenPublico(direccion)}/publico/${token}`;
}
