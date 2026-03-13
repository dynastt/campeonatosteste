import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Championship, Team, Match, Round, GameDay, KnockoutMatch, KnockoutPhase } from '@/types/championship';
import { useAuth } from './useAuth';
import { createTeamSchema, createChampionshipSchema, updateMatchSchema, teamNameSchema, logoUrlSchema, championshipNameSchema, descriptionSchema, goalsSchema, gameDayNameSchema, validateOrThrow } from '@/utils/validation';
import { z } from 'zod';

function mapChampionship(row: any): Championship {
  return {
    id: row.id,
    name: row.name,
    startDate: row.start_date || undefined,
    description: row.description || undefined,
    teamIds: row.team_ids || [],
    gameDays: row.game_days || [],
    knockoutPhases: (row.knockout_phases || []) as KnockoutPhase[],
    gameDayNames: row.game_day_names || [],
    qualifyingTeams: row.qualifying_teams || {},
    logo: row.logo || undefined,
    deletedAt: row.deleted_at || undefined,
    createdAt: row.created_at,
  };
}

function mapTeam(row: any): Team {
  return { id: row.id, name: row.name, logo: row.logo || undefined, createdAt: row.created_at };
}

function mapMatch(row: any): Match {
  return {
    id: row.id, championshipId: row.championship_id, gameDayId: row.game_day_id || undefined,
    homeTeamId: row.home_team_id, awayTeamId: row.away_team_id,
    homeGoals: row.home_goals, awayGoals: row.away_goals,
    homeWO: row.home_wo, awayWO: row.away_wo,
    round: row.round, played: row.played, matchTime: row.match_time || undefined,
    createdAt: row.created_at,
  };
}

function mapRound(row: any): Round {
  return {
    id: row.id, championshipId: row.championship_id, gameDayId: row.game_day_id || undefined,
    number: row.number, name: row.name || undefined, date: row.date || undefined,
    createdAt: row.created_at,
  };
}

function mapGameDay(row: any): GameDay {
  return {
    id: row.id, championshipId: row.championship_id, name: row.name,
    teamIds: row.team_ids || [], createdAt: row.created_at,
  };
}

function mapKnockoutMatch(row: any): KnockoutMatch {
  return {
    id: row.id, championshipId: row.championship_id, phase: row.phase as KnockoutPhase,
    position: row.position, homeTeamId: row.home_team_id, awayTeamId: row.away_team_id,
    homeGoals: row.home_goals, awayGoals: row.away_goals,
    homeWO: row.home_wo, awayWO: row.away_wo,
    winnerId: row.winner_id, createdAt: row.created_at,
  };
}

export function useChampionships() {
  const { user } = useAuth();
  const [championships, setChampionships] = useState<Championship[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [gameDays, setGameDays] = useState<GameDay[]>([]);
  const [knockoutMatches, setKnockoutMatches] = useState<KnockoutMatch[]>([]);

  // Fetch all data when user changes
  useEffect(() => {
    if (!user) {
      setChampionships([]);
      setTeams([]);
      setMatches([]);
      setRounds([]);
      setGameDays([]);
      setKnockoutMatches([]);
      return;
    }
    const fetchAll = async () => {
      const [cRes, tRes, mRes, rRes, gRes, kRes] = await Promise.all([
        supabase.from('championships').select('*').order('created_at', { ascending: false }),
        supabase.from('teams').select('*').order('name'),
        supabase.from('matches').select('*'),
        supabase.from('rounds').select('*').order('number'),
        supabase.from('game_days').select('*'),
        supabase.from('knockout_matches').select('*').order('position'),
      ]);
      if (cRes.data) setChampionships(cRes.data.map(mapChampionship));
      if (tRes.data) setTeams(tRes.data.map(mapTeam));
      if (mRes.data) setMatches(mRes.data.map(mapMatch));
      if (rRes.data) setRounds(rRes.data.map(mapRound));
      if (gRes.data) setGameDays(gRes.data.map(mapGameDay));
      if (kRes.data) setKnockoutMatches(kRes.data.map(mapKnockoutMatch));
    };
    fetchAll();
  }, [user]);

  // Broadcast to shared channel when data changes
  const broadcastUpdate = useCallback((championshipId: string) => {
    supabase.channel(`shared:${championshipId}`).send({
      type: 'broadcast',
      event: 'data_updated',
      payload: {},
    });
  }, []);

  // Championship CRUD
  const createChampionship = useCallback(async (data: Omit<Championship, 'id' | 'teamIds' | 'createdAt'>) => {
    if (!user) return null;
    const validated = validateOrThrow(createChampionshipSchema, data);
    const { data: row, error } = await supabase.from('championships').insert({
      user_id: user.id,
      name: validated.name,
      start_date: validated.startDate || null,
      description: validated.description || null,
      team_ids: [],
      game_days: data.gameDays || [],
      knockout_phases: data.knockoutPhases || ['quarter-finals', 'semi-finals', 'final'],
      game_day_names: data.gameDayNames || [],
      qualifying_teams: data.qualifyingTeams || {},
      logo: data.logo || null,
    }).select().single();
    if (error || !row) return null;
    const mapped = mapChampionship(row);
    setChampionships(prev => [mapped, ...prev]);
    return mapped;
  }, [user]);

  const updateChampionship = useCallback(async (id: string, data: Partial<Championship>) => {
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = validateOrThrow(championshipNameSchema, data.name);
    if (data.startDate !== undefined) updateData.start_date = data.startDate;
    if (data.description !== undefined) updateData.description = data.description ? validateOrThrow(descriptionSchema, data.description) : null;
    if (data.teamIds !== undefined) updateData.team_ids = data.teamIds;
    if (data.gameDays !== undefined) updateData.game_days = data.gameDays;
    if (data.knockoutPhases !== undefined) updateData.knockout_phases = data.knockoutPhases;
    if (data.gameDayNames !== undefined) updateData.game_day_names = data.gameDayNames;
    if (data.qualifyingTeams !== undefined) updateData.qualifying_teams = data.qualifyingTeams;
    if (data.logo !== undefined) updateData.logo = data.logo || null;
    await supabase.from('championships').update(updateData).eq('id', id);
    setChampionships(prev => prev.map(c => c.id === id ? { ...c, ...data } : c));
    broadcastUpdate(id);
  }, [broadcastUpdate]);

  // Soft delete - move to trash
  const deleteChampionship = useCallback(async (id: string) => {
    const now = new Date().toISOString();
    await supabase.from('championships').update({ deleted_at: now }).eq('id', id);
    setChampionships(prev => prev.map(c => c.id === id ? { ...c, deletedAt: now } : c));
  }, []);

  // Restore from trash
  const restoreChampionship = useCallback(async (id: string) => {
    await supabase.from('championships').update({ deleted_at: null }).eq('id', id);
    setChampionships(prev => prev.map(c => c.id === id ? { ...c, deletedAt: undefined } : c));
  }, []);

  // Permanent delete
  const permanentDeleteChampionship = useCallback(async (id: string) => {
    await supabase.from('championships').delete().eq('id', id);
    setChampionships(prev => prev.filter(c => c.id !== id));
    setMatches(prev => prev.filter(m => m.championshipId !== id));
    setRounds(prev => prev.filter(r => r.championshipId !== id));
    setGameDays(prev => prev.filter(g => g.championshipId !== id));
    setKnockoutMatches(prev => prev.filter(k => k.championshipId !== id));
  }, []);

  const getChampionship = useCallback((id: string) => {
    return championships.find(c => c.id === id);
  }, [championships]);

  // Team CRUD
  const createTeam = useCallback(async (data: Omit<Team, 'id' | 'createdAt'>) => {
    if (!user) return null;
    const validated = validateOrThrow(createTeamSchema, data);
    const { data: row, error } = await supabase.from('teams').insert({
      user_id: user.id, name: validated.name, logo: validated.logo || null,
    }).select().single();
    if (error || !row) return null;
    const mapped = mapTeam(row);
    setTeams(prev => [...prev, mapped]);
    return mapped;
  }, [user]);

  const updateTeam = useCallback(async (id: string, data: Partial<Team>) => {
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = validateOrThrow(teamNameSchema, data.name);
    if (data.logo !== undefined) updateData.logo = data.logo ? validateOrThrow(logoUrlSchema, data.logo) : null;
    await supabase.from('teams').update(updateData).eq('id', id);
    setTeams(prev => prev.map(t => t.id === id ? { ...t, ...data } : t));
  }, []);

  const deleteTeam = useCallback(async (id: string) => {
    await supabase.from('teams').delete().eq('id', id);
    setTeams(prev => prev.filter(t => t.id !== id));
    setChampionships(prev => prev.map(c => ({
      ...c, teamIds: c.teamIds.filter(tid => tid !== id)
    })));
  }, []);

  const getTeam = useCallback((id: string) => teams.find(t => t.id === id), [teams]);

  // Championship-Team
  const addTeamToChampionship = useCallback(async (championshipId: string, teamId: string) => {
    const champ = championships.find(c => c.id === championshipId);
    if (!champ || champ.teamIds.includes(teamId)) return;
    const newTeamIds = [...champ.teamIds, teamId];
    await supabase.from('championships').update({ team_ids: newTeamIds }).eq('id', championshipId);
    setChampionships(prev => prev.map(c => c.id === championshipId ? { ...c, teamIds: newTeamIds } : c));
  }, [championships]);

  const removeTeamFromChampionship = useCallback(async (championshipId: string, teamId: string) => {
    const champ = championships.find(c => c.id === championshipId);
    if (!champ) return;
    const newTeamIds = champ.teamIds.filter(id => id !== teamId);
    await supabase.from('championships').update({ team_ids: newTeamIds }).eq('id', championshipId);
    setChampionships(prev => prev.map(c => c.id === championshipId ? { ...c, teamIds: newTeamIds } : c));
    // Delete matches with this team in this championship
    await supabase.from('matches').delete().eq('championship_id', championshipId).or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`);
    setMatches(prev => prev.filter(m => !(m.championshipId === championshipId && (m.homeTeamId === teamId || m.awayTeamId === teamId))));
  }, [championships]);

  const getChampionshipTeams = useCallback((championshipId: string) => {
    const champ = championships.find(c => c.id === championshipId);
    if (!champ) return [];
    return teams.filter(t => champ.teamIds.includes(t.id));
  }, [championships, teams]);

  const getTeamsNotInChampionship = useCallback((championshipId: string) => {
    const champ = championships.find(c => c.id === championshipId);
    if (!champ) return teams;
    return teams.filter(t => !champ.teamIds.includes(t.id));
  }, [championships, teams]);

  // GameDay CRUD
  const createGameDay = useCallback(async (championshipId: string, name: string) => {
    if (!user) return null;
    const validatedName = validateOrThrow(gameDayNameSchema, name);
    const { data: row, error } = await supabase.from('game_days').insert({
      user_id: user.id, championship_id: championshipId, name: validatedName, team_ids: [],
    }).select().single();
    if (error || !row) return null;
    const mapped = mapGameDay(row);
    setGameDays(prev => [...prev, mapped]);
    return mapped;
  }, [user]);

  const updateGameDay = useCallback(async (id: string, data: Partial<GameDay>) => {
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.teamIds !== undefined) updateData.team_ids = data.teamIds;
    await supabase.from('game_days').update(updateData).eq('id', id);
    setGameDays(prev => prev.map(g => g.id === id ? { ...g, ...data } : g));
  }, []);

  const deleteGameDay = useCallback(async (id: string) => {
    await supabase.from('game_days').delete().eq('id', id);
    setGameDays(prev => prev.filter(g => g.id !== id));
    setMatches(prev => prev.filter(m => m.gameDayId !== id));
    setRounds(prev => prev.filter(r => r.gameDayId !== id));
  }, []);

  const getChampionshipGameDays = useCallback((championshipId: string) => {
    return gameDays.filter(g => g.championshipId === championshipId);
  }, [gameDays]);

  const addTeamToGameDay = useCallback(async (gameDayId: string, teamId: string) => {
    const gd = gameDays.find(g => g.id === gameDayId);
    if (!gd || gd.teamIds.includes(teamId)) return;
    const newTeamIds = [...gd.teamIds, teamId];
    await supabase.from('game_days').update({ team_ids: newTeamIds }).eq('id', gameDayId);
    setGameDays(prev => prev.map(g => g.id === gameDayId ? { ...g, teamIds: newTeamIds } : g));
  }, [gameDays]);

  const removeTeamFromGameDay = useCallback(async (gameDayId: string, teamId: string) => {
    const gd = gameDays.find(g => g.id === gameDayId);
    if (!gd) return;
    const newTeamIds = gd.teamIds.filter(id => id !== teamId);
    await supabase.from('game_days').update({ team_ids: newTeamIds }).eq('id', gameDayId);
    setGameDays(prev => prev.map(g => g.id === gameDayId ? { ...g, teamIds: newTeamIds } : g));
  }, [gameDays]);

  const getGameDayTeams = useCallback((gameDayId: string) => {
    const gd = gameDays.find(g => g.id === gameDayId);
    if (!gd) return [];
    return teams.filter(t => gd.teamIds.includes(t.id));
  }, [gameDays, teams]);

  // Round CRUD
  const createRound = useCallback(async (championshipId: string, name?: string, gameDayId?: string) => {
    if (!user) return null;
    const existingRounds = rounds.filter(r =>
      r.championshipId === championshipId && (gameDayId ? r.gameDayId === gameDayId : !r.gameDayId)
    );
    const nextNumber = existingRounds.length > 0 ? Math.max(...existingRounds.map(r => r.number)) + 1 : 1;
    const { data: row, error } = await supabase.from('rounds').insert({
      user_id: user.id, championship_id: championshipId, game_day_id: gameDayId || null,
      number: nextNumber, name: name || null,
    }).select().single();
    if (error || !row) return null;
    const mapped = mapRound(row);
    setRounds(prev => [...prev, mapped]);
    return mapped;
  }, [user, rounds]);

  const updateRound = useCallback(async (id: string, data: Partial<Round>) => {
    const updateData: any = {};
    if (data.number !== undefined) updateData.number = data.number;
    if (data.name !== undefined) updateData.name = data.name;
    if (data.date !== undefined) updateData.date = data.date || null;
    await supabase.from('rounds').update(updateData).eq('id', id);
    setRounds(prev => prev.map(r => r.id === id ? { ...r, ...data } : r));
    // Broadcast for shared links
    const round = rounds.find(r => r.id === id);
    if (round) broadcastUpdate(round.championshipId);
  }, [rounds, broadcastUpdate]);

  const deleteRound = useCallback(async (id: string) => {
    const round = rounds.find(r => r.id === id);
    await supabase.from('rounds').delete().eq('id', id);
    setRounds(prev => prev.filter(r => r.id !== id));
    if (round) {
      let query = supabase.from('matches').delete()
        .eq('championship_id', round.championshipId)
        .eq('round', round.number);
      if (round.gameDayId) query = query.eq('game_day_id', round.gameDayId);
      else query = query.is('game_day_id', null);
      await query;
      setMatches(prev => prev.filter(m =>
        !(m.championshipId === round.championshipId && m.round === round.number && m.gameDayId === round.gameDayId)
      ));
    }
  }, [rounds]);

  const getChampionshipRounds = useCallback((championshipId: string, gameDayId?: string) => {
    return rounds
      .filter(r => r.championshipId === championshipId && (gameDayId !== undefined ? r.gameDayId === gameDayId : true))
      .sort((a, b) => a.number - b.number);
  }, [rounds]);

  // Match CRUD
  const createMatch = useCallback(async (data: Omit<Match, 'id' | 'createdAt'>) => {
    if (!user) return null;
    const { data: row, error } = await supabase.from('matches').insert({
      user_id: user.id, championship_id: data.championshipId,
      game_day_id: data.gameDayId || null,
      home_team_id: data.homeTeamId, away_team_id: data.awayTeamId,
      home_goals: data.homeGoals, away_goals: data.awayGoals,
      home_wo: data.homeWO, away_wo: data.awayWO,
      round: data.round ?? 0, played: data.played ?? false,
    }).select().single();
    if (error || !row) return null;
    const mapped = mapMatch(row);
    setMatches(prev => [...prev, mapped]);
    return mapped;
  }, [user]);

  const updateMatch = useCallback(async (id: string, data: Partial<Match>) => {
    const validated = validateOrThrow(updateMatchSchema, {
      homeGoals: data.homeGoals,
      awayGoals: data.awayGoals,
      homeWO: data.homeWO,
      awayWO: data.awayWO,
      played: data.played,
      homeTeamId: data.homeTeamId,
      awayTeamId: data.awayTeamId,
    });
    const updateData: any = {};
    if (validated.homeGoals !== undefined) updateData.home_goals = validated.homeGoals;
    if (validated.awayGoals !== undefined) updateData.away_goals = validated.awayGoals;
    if (validated.homeWO !== undefined) updateData.home_wo = validated.homeWO;
    if (validated.awayWO !== undefined) updateData.away_wo = validated.awayWO;
    if (validated.played !== undefined) updateData.played = validated.played;
    if (validated.homeTeamId !== undefined) updateData.home_team_id = validated.homeTeamId;
    if (validated.awayTeamId !== undefined) updateData.away_team_id = validated.awayTeamId;
    await supabase.from('matches').update(updateData).eq('id', id);
    setMatches(prev => prev.map(m => m.id === id ? { ...m, ...data } : m));
    // Broadcast update for the match's championship
    const match = matches.find(m => m.id === id);
    if (match) broadcastUpdate(match.championshipId);
  }, [matches, broadcastUpdate]);

  const deleteMatch = useCallback(async (id: string) => {
    await supabase.from('matches').delete().eq('id', id);
    setMatches(prev => prev.filter(m => m.id !== id));
  }, []);

  const getChampionshipMatches = useCallback((championshipId: string, gameDayId?: string) => {
    return matches.filter(m =>
      m.championshipId === championshipId && (gameDayId !== undefined ? m.gameDayId === gameDayId : true)
    );
  }, [matches]);

  const getRoundMatches = useCallback((championshipId: string, roundNumber: number, gameDayId?: string) => {
    return matches.filter(m =>
      m.championshipId === championshipId && m.round === roundNumber &&
      (gameDayId !== undefined ? m.gameDayId === gameDayId : true)
    );
  }, [matches]);

  // Knockout CRUD
  const createKnockoutMatch = useCallback(async (data: Omit<KnockoutMatch, 'id' | 'createdAt'>) => {
    if (!user) return null;
    const { data: row, error } = await supabase.from('knockout_matches').insert({
      user_id: user.id, championship_id: data.championshipId,
      phase: data.phase, position: data.position,
      home_team_id: data.homeTeamId, away_team_id: data.awayTeamId,
      home_goals: data.homeGoals, away_goals: data.awayGoals,
      home_wo: data.homeWO, away_wo: data.awayWO,
      winner_id: data.winnerId,
    }).select().single();
    if (error || !row) return null;
    const mapped = mapKnockoutMatch(row);
    setKnockoutMatches(prev => [...prev, mapped]);
    return mapped;
  }, [user]);

  const updateKnockoutMatch = useCallback(async (id: string, data: Partial<KnockoutMatch>) => {
    const updateData: any = {};
    if (data.homeTeamId !== undefined) updateData.home_team_id = data.homeTeamId;
    if (data.awayTeamId !== undefined) updateData.away_team_id = data.awayTeamId;
    if (data.homeGoals !== undefined) updateData.home_goals = validateOrThrow(goalsSchema, data.homeGoals);
    if (data.awayGoals !== undefined) updateData.away_goals = validateOrThrow(goalsSchema, data.awayGoals);
    if (data.homeWO !== undefined) updateData.home_wo = data.homeWO;
    if (data.awayWO !== undefined) updateData.away_wo = data.awayWO;
    if (data.winnerId !== undefined) updateData.winner_id = data.winnerId;
    await supabase.from('knockout_matches').update(updateData).eq('id', id);
    setKnockoutMatches(prev => prev.map(m => m.id === id ? { ...m, ...data } : m));
    const km = knockoutMatches.find(m => m.id === id);
    if (km) broadcastUpdate(km.championshipId);
  }, [knockoutMatches, broadcastUpdate]);

  const deleteKnockoutMatch = useCallback(async (id: string) => {
    await supabase.from('knockout_matches').delete().eq('id', id);
    setKnockoutMatches(prev => prev.filter(m => m.id !== id));
  }, []);

  const getChampionshipKnockoutMatches = useCallback((championshipId: string) => {
    return knockoutMatches.filter(m => m.championshipId === championshipId);
  }, [knockoutMatches]);

  return {
    championships, teams, matches, rounds, gameDays, knockoutMatches,
    createChampionship, updateChampionship, deleteChampionship, restoreChampionship, permanentDeleteChampionship, getChampionship,
    createTeam, updateTeam, deleteTeam, getTeam,
    addTeamToChampionship, removeTeamFromChampionship, getChampionshipTeams, getTeamsNotInChampionship,
    createGameDay, updateGameDay, deleteGameDay, getChampionshipGameDays,
    addTeamToGameDay, removeTeamFromGameDay, getGameDayTeams,
    createRound, updateRound, deleteRound, getChampionshipRounds,
    createMatch, updateMatch, deleteMatch, getChampionshipMatches, getRoundMatches,
    createKnockoutMatch, updateKnockoutMatch, deleteKnockoutMatch, getChampionshipKnockoutMatches,
  };
}
