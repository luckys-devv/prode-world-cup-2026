import { db } from '../../config/database.js';

interface MatchFilters {
  stage?: string;
  status?: string;
  groupName?: string;
  date?: string; // Formato YYYY-MM-DD
}

/**
 * Obtiene el listado de partidos aplicando los filtros opcionales.
 */
export async function getMatches(filters: MatchFilters) {
  const { stage, status, groupName, date } = filters;
  const whereClause: any = {};

  if (stage) whereClause.stage = stage;
  if (status) whereClause.status = status;
  if (groupName) whereClause.groupName = groupName;

  if (date) {
    // Si viene fecha, buscamos los partidos ocurridos en ese rango de 24 horas en UTC
    const startDate = new Date(`${date}T00:00:00.000Z`);
    const endDate = new Date(`${date}T23:59:59.999Z`);
    whereClause.matchDate = {
      gte: startDate,
      lte: endDate,
    };
  }

  return await db.match.findMany({
    where: whereClause,
    select: {
      id: true,
      matchDate: true,
      status: true,
      stage: true,
      groupName: true,
      homeScore: true,
      awayScore: true,
      homeTeam: {
        select: {
          id: true,
          name: true,
          crestUrl: true,
        },
      },
      awayTeam: {
        select: {
          id: true,
          name: true,
          crestUrl: true,
        },
      },
    },
    orderBy: {
      matchDate: 'asc',
    },
  });
}

/**
 * Obtiene el detalle de un partido específico por su ID interno.
 */
export async function getMatchById(id: number) {
  return await db.match.findUnique({
    where: { id },
    include: {
      homeTeam: true,
      awayTeam: true,
    },
  });
}

/**
 * Obtiene el listado de todos los equipos del Mundial en orden alfabético.
 */
export async function getAllTeams() {
  return await db.team.findMany({
    orderBy: {
      name: 'asc',
    },
  });
}