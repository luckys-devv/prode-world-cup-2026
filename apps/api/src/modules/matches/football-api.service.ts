import axios from 'axios';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';

// Creamos una instancia de Axios preconfigurada para football-data.org
const apiClient = axios.create({
  baseURL: 'https://api.football-data.org/v4',
  headers: {
    'X-Auth-Token': env.FOOTBALL_API_KEY,
  },
});

export interface ExternalTeam {
  id: number;
  name: string;
  shortName: string;
  tla: string;
  crest: string | null;
}

export interface ExternalMatch {
  id: number;
  utcDate: string;
  status: string;
  matchday: number | null;
  stage: string;
  group: string | null;
  homeTeam: {
    id: number;
    name: string;
    shortName: string;
    tla: string;
    crest: string | null;
  };
  awayTeam: {
    id: number;
    name: string;
    shortName: string;
    tla: string;
    crest: string | null;
  };
  score: {
    winner: string | null;
    fullTime: {
      home: number | null;
      away: number | null;
    };
  };
}

/**
 * Trae los 48 equipos participantes del Mundial 2026
 */
export async function fetchExternalTeams(): Promise<ExternalTeam[]> {
  try {
    logger.info('Solicitando equipos a football-data.org...');
    const response = await apiClient.get('/competitions/WC/teams');

    if (!response.data || !response.data.teams) {
      throw new Error('La respuesta de la API no contiene el listado de equipos');
    }

    return response.data.teams;
  } catch (error: any) {
    logger.error('Error al obtener equipos externos:', error.message);
    throw error;
  }
}

/**
 * Trae todos los partidos del Mundial 2026 (programados o jugados)
 */
export async function fetchExternalMatches(): Promise<ExternalMatch[]> {
  try {
    logger.info('Solicitando fixture a football-data.org para la temporada 2026...');
    // Forzamos season=2026 para el Mundial de Norteamérica 2026
    const response = await apiClient.get('/competitions/WC/matches?season=2026');

    if (!response.data || !response.data.matches) {
      throw new Error('La respuesta de la API no contiene el listado de partidos');
    }

    return response.data.matches;
  } catch (error: any) {
    logger.error('Error al obtener partidos externos:', error.message);
    throw error;
  }
}