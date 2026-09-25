import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'Astrolegia',
        short_name: 'Astrolegia',
        description:
            'Cartas natales, Diseño Humano, Kin Maya, numerología y sinastría en un solo cosmos.',
        start_url: '/',
        display: 'standalone',
        background_color: '#03030b',
        theme_color: '#03030b',
        icons: [
            { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
            {
                src: '/icons/icon-512-maskable.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'maskable',
            },
        ],
    };
}
