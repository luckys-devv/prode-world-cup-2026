import { Request, Response, NextFunction } from 'express';
import * as matchesService from './matches.service.js';
import { sendSuccess, sendNotFound, sendBadRequest } from '../../utils/apiResponse.js';

/**
 * Endpoint para listar partidos con filtros opcionales.
 * GET /api/matches?stage=GROUP_STAGE&status=SCHEDULED&groupName=GROUP_A&date=2026-06-11
 */
export async function listMatches(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { stage, status, groupName, date, dateFrom, dateTo } = req.query;

    const filters = {
      stage: stage ? String(stage) : undefined,
      status: status ? String(status) : undefined,
      groupName: groupName ? String(groupName) : undefined,
      date: date ? String(date) : undefined,
      dateFrom: dateFrom ? String(dateFrom) : undefined,
      dateTo: dateTo ? String(dateTo) : undefined,
    };

    const matches = await matchesService.getMatches(filters);
    sendSuccess(res, matches, 'Partidos obtenidos con éxito.');
  } catch (error) {
    next(error);
  }
}

/**
 * Endpoint para ver el detalle de un partido específico.
 * GET /api/matches/:id
 */
export async function getMatchDetail(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id as string, 10);

    if (isNaN(id)) {
      return sendBadRequest(res, 'El ID de partido provisto no es válido.');
    }

    const match = await matchesService.getMatchById(id);

    if (!match) {
      return sendNotFound(res, 'El partido solicitado no existe.');
    }

    sendSuccess(res, match, 'Detalle del partido obtenido con éxito.');
  } catch (error) {
    next(error);
  }
}

/**
 * Endpoint para obtener todos los equipos del Mundial.
 * GET /api/matches/teams
 */
export async function listTeams(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const teams = await matchesService.getAllTeams();
    sendSuccess(res, teams, 'Equipos obtenidos con éxito.');
  } catch (error) {
    next(error);
  }
}