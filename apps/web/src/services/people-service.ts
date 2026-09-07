/**
 * People Service — personas (NatalProfile) y cartas cacheadas, vía la API.
 *
 *   GET    /v1/client/people                      listPeople
 *   POST   /v1/client/people                      createPerson
 *   GET    /v1/client/people/:id                  getPerson
 *   PATCH  /v1/client/people/:id                  updatePerson
 *   DELETE /v1/client/people/:id                  deletePerson
 *   GET    /v1/client/people/:id/charts/:type     getPersonChart
 *   PUT    /v1/client/people/:id/charts/:type     savePersonChart (cartas calculadas en el cliente)
 *   POST   /v1/client/people/:id/charts/natal     generateNatalChart (la calcula la API)
 *
 * El usuario sale de la sesión (cookie): ninguna función recibe uid. Los
 * nombres de campo son los del esquema de Prisma (.AGENTS §4).
 */

import type {
    ChartCalculationDTO,
    ChartType,
    CreateNatalProfileDTO,
    NatalChartResultDTO,
    NatalProfileWithChartsDTO,
    SaveChartDTO,
    UpdateNatalProfileDTO,
} from '@astrolegia/contracts';
import { api, apiOrNull } from '@/lib/api';

const BASE = '/v1/client/people';

export function listPeople(): Promise<NatalProfileWithChartsDTO[]> {
    return api<NatalProfileWithChartsDTO[]>(BASE);
}

export function getPerson(id: string): Promise<NatalProfileWithChartsDTO | null> {
    return apiOrNull<NatalProfileWithChartsDTO>(`${BASE}/${encodeURIComponent(id)}`);
}

export function createPerson(input: CreateNatalProfileDTO): Promise<NatalProfileWithChartsDTO> {
    return api<NatalProfileWithChartsDTO>(BASE, { method: 'POST', json: input });
}

export function updatePerson(id: string, input: UpdateNatalProfileDTO): Promise<NatalProfileWithChartsDTO> {
    return api<NatalProfileWithChartsDTO>(`${BASE}/${encodeURIComponent(id)}`, { method: 'PATCH', json: input });
}

export async function deletePerson(id: string): Promise<void> {
    await api(`${BASE}/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export function getPersonChart(id: string, type: ChartType): Promise<ChartCalculationDTO | null> {
    return apiOrNull<ChartCalculationDTO>(`${BASE}/${encodeURIComponent(id)}/charts/${type}`);
}

export function savePersonChart(id: string, type: Exclude<ChartType, 'natal'>, body: SaveChartDTO): Promise<ChartCalculationDTO> {
    return api<ChartCalculationDTO>(`${BASE}/${encodeURIComponent(id)}/charts/${type}`, { method: 'PUT', json: body });
}

export function generateNatalChart(id: string): Promise<NatalChartResultDTO> {
    return api<NatalChartResultDTO>(`${BASE}/${encodeURIComponent(id)}/charts/natal`, { method: 'POST' });
}
