import { useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';
import { Championship, Team, Match, Round, GameDay, KnockoutMatch } from '@/types/championship';

const generateId = () => Math.random().toString(36).substring(2, 15);

export function useChampionships() {
  const [championships, setChampionships] = useLocalStorage<Championship[]>('championships', []);
  const [teams, setTeams] = useLocalStorage<Team[]>('teams', []);
  const [matches, setMatches] = useLocalStorage<Match[]>('matches', []);
  const [rounds, setRounds] = useLocalStorage<Round[]>('rounds', []);
  const [gameDays, setGameDays] = useLocalStorage<GameDay[]>('gameDays', []);
  const [knockoutMatches, setKnockoutMatches] = useLocalStorage<KnockoutMatch[]>('knockoutMatches', []);

  // Championship CRUD
  const createChampionship = useCallback((data: Omit<Championship, 'id' | 'teamIds' | 'createdAt'>) => {
    const newChampionship: Championship = {
      ...data,
      id: generateId(),
      teamIds: [],
      gameDays: data.gameDays || [],
      createdAt: new Date().toISOString(),
    };
    setChampionships(prev => [...prev, newChampionship]);
    return newChampionship;
  }, [setChampionships]);

  const updateChampionship = useCallback((id: string, data: Partial<Championship>) => {
    setChampionships(prev => prev.map(c => c.id === id ? { ...c, ...data } : c));
  }, [setChampionships]);

  const deleteChampionship = useCallback((id: string) => {
    setChampionships(prev => prev.filter(c => c.id !== id));
    setMatches(prev => prev.filter(m => m.championshipId !== id));
    setRounds(prev => prev.filter(r => r.championshipId !== id));
    setGameDays(prev => prev.filter(g => g.championshipId !== id));
    setKnockoutMatches(prev => prev.filter(k => k.championshipId !== id));
  }, [setChampionships, setMatches, setRounds, setGameDays, setKnockoutMatches]);

  const getChampionship = useCallback((id: string) => {
    return championships.find(c => c.id === id);
  }, [championships]);

  // Team CRUD
  const createTeam = useCallback((data: Omit<Team, 'id' | 'createdAt'>) => {
    const newTeam: Team = {
      ...data,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };
    setTeams(prev => [...prev, newTeam]);
    return newTeam;
  }, [setTeams]);

  const updateTeam = useCallback((id: string, data: Partial<Team>) => {
    setTeams(prev => prev.map(t => t.id === id ? { ...t, ...data } : t));
  }, [setTeams]);

  const deleteTeam = useCallback((id: string) => {
    setTeams(prev => prev.filter(t => t.id !== id));
    setChampionships(prev => prev.map(c => ({
      ...c,
      teamIds: c.teamIds.filter(tid => tid !== id)
    })));
    setMatches(prev => prev.filter(m => m.homeTeamId !== id && m.awayTeamId !== id));
  }, [setTeams, setChampionships, setMatches]);

  const getTeam = useCallback((id: string) => {
    return teams.find(t => t.id === id);
  }, [teams]);

  // Championship-Team operations
  const addTeamToChampionship = useCallback((championshipId: string, teamId: string) => {
    setChampionships(prev => prev.map(c => {
      if (c.id === championshipId && !c.teamIds.includes(teamId)) {
        return { ...c, teamIds: [...c.teamIds, teamId] };
      }
      return c;
    }));
  }, [setChampionships]);

  const removeTeamFromChampionship = useCallback((championshipId: string, teamId: string) => {
    setChampionships(prev => prev.map(c => {
      if (c.id === championshipId) {
        return { ...c, teamIds: c.teamIds.filter(id => id !== teamId) };
      }
      return c;
    }));
    setMatches(prev => prev.filter(m =>
      !(m.championshipId === championshipId && (m.homeTeamId === teamId || m.awayTeamId === teamId))
    ));
  }, [setChampionships, setMatches]);

  const getChampionshipTeams = useCallback((championshipId: string) => {
    const championship = championships.find(c => c.id === championshipId);
    if (!championship) return [];
    return teams.filter(t => championship.teamIds.includes(t.id));
  }, [championships, teams]);

  const getTeamsNotInChampionship = useCallback((championshipId: string) => {
    const championship = championships.find(c => c.id === championshipId);
    if (!championship) return teams;
    return teams.filter(t => !championship.teamIds.includes(t.id));
  }, [championships, teams]);

  // GameDay CRUD
  const createGameDay = useCallback((championshipId: string, name: string) => {
    const newGameDay: GameDay = {
      id: generateId(),
      championshipId,
      name,
      teamIds: [],
      createdAt: new Date().toISOString(),
    };
    setGameDays(prev => [...prev, newGameDay]);
    return newGameDay;
  }, [setGameDays]);

  const updateGameDay = useCallback((id: string, data: Partial<GameDay>) => {
    setGameDays(prev => prev.map(g => g.id === id ? { ...g, ...data } : g));
  }, [setGameDays]);

  const deleteGameDay = useCallback((id: string) => {
    setGameDays(prev => prev.filter(g => g.id !== id));
    setMatches(prev => prev.filter(m => m.gameDayId !== id));
    setRounds(prev => prev.filter(r => r.gameDayId !== id));
  }, [setGameDays, setMatches, setRounds]);

  const getChampionshipGameDays = useCallback((championshipId: string) => {
    return gameDays.filter(g => g.championshipId === championshipId);
  }, [gameDays]);

  const addTeamToGameDay = useCallback((gameDayId: string, teamId: string) => {
    setGameDays(prev => prev.map(g => {
      if (g.id === gameDayId && !g.teamIds.includes(teamId)) {
        return { ...g, teamIds: [...g.teamIds, teamId] };
      }
      return g;
    }));
  }, [setGameDays]);

  const removeTeamFromGameDay = useCallback((gameDayId: string, teamId: string) => {
    setGameDays(prev => prev.map(g => {
      if (g.id === gameDayId) {
        return { ...g, teamIds: g.teamIds.filter(id => id !== teamId) };
      }
      return g;
    }));
  }, [setGameDays]);

  const getGameDayTeams = useCallback((gameDayId: string) => {
    const gameDay = gameDays.find(g => g.id === gameDayId);
    if (!gameDay) return [];
    return teams.filter(t => gameDay.teamIds.includes(t.id));
  }, [gameDays, teams]);

  // Round CRUD
  const createRound = useCallback((championshipId: string, name?: string, gameDayId?: string) => {
    const existingRounds = rounds.filter(r =>
      r.championshipId === championshipId &&
      (gameDayId ? r.gameDayId === gameDayId : !r.gameDayId)
    );
    const nextNumber = existingRounds.length > 0
      ? Math.max(...existingRounds.map(r => r.number)) + 1
      : 1;

    const newRound: Round = {
      id: generateId(),
      championshipId,
      gameDayId,
      number: nextNumber,
      name,
      createdAt: new Date().toISOString(),
    };
    setRounds(prev => [...prev, newRound]);
    return newRound;
  }, [rounds, setRounds]);

  const updateRound = useCallback((id: string, data: Partial<Round>) => {
    setRounds(prev => prev.map(r => r.id === id ? { ...r, ...data } : r));
  }, [setRounds]);

  const deleteRound = useCallback((id: string) => {
    setRounds(prev => prev.filter(r => r.id !== id));
    const round = rounds.find(r => r.id === id);
    if (round) {
      setMatches(prev => prev.filter(m =>
        !(m.championshipId === round.championshipId && m.round === round.number && m.gameDayId === round.gameDayId)
      ));
    }
  }, [rounds, setRounds, setMatches]);

  const getChampionshipRounds = useCallback((championshipId: string, gameDayId?: string) => {
    return rounds
      .filter(r => r.championshipId === championshipId &&
        (gameDayId !== undefined ? r.gameDayId === gameDayId : true))
      .sort((a, b) => a.number - b.number);
  }, [rounds]);

  // Match CRUD
  const createMatch = useCallback((data: Omit<Match, 'id' | 'createdAt'>) => {
    const newMatch: Match = {
      ...data,
      id: generateId(),
      round: data.round ?? 0,
      played: data.played ?? false,
      homeGoals: data.homeGoals ?? null,
      awayGoals: data.awayGoals ?? null,
      createdAt: new Date().toISOString(),
    };
    setMatches(prev => [...prev, newMatch]);
    return newMatch;
  }, [setMatches]);

  const updateMatch = useCallback((id: string, data: Partial<Match>) => {
    setMatches(prev => prev.map(m => m.id === id ? { ...m, ...data } : m));
  }, [setMatches]);

  const deleteMatch = useCallback((id: string) => {
    setMatches(prev => prev.filter(m => m.id !== id));
  }, [setMatches]);

  const getChampionshipMatches = useCallback((championshipId: string, gameDayId?: string) => {
    return matches.filter(m =>
      m.championshipId === championshipId &&
      (gameDayId !== undefined ? m.gameDayId === gameDayId : true)
    );
  }, [matches]);

  const getRoundMatches = useCallback((championshipId: string, roundNumber: number, gameDayId?: string) => {
    return matches.filter(m =>
      m.championshipId === championshipId &&
      m.round === roundNumber &&
      (gameDayId !== undefined ? m.gameDayId === gameDayId : true)
    );
  }, [matches]);

  // Knockout CRUD
  const createKnockoutMatch = useCallback((data: Omit<KnockoutMatch, 'id' | 'createdAt'>) => {
    const newMatch: KnockoutMatch = {
      ...data,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };
    setKnockoutMatches(prev => [...prev, newMatch]);
    return newMatch;
  }, [setKnockoutMatches]);

  const updateKnockoutMatch = useCallback((id: string, data: Partial<KnockoutMatch>) => {
    setKnockoutMatches(prev => prev.map(m => m.id === id ? { ...m, ...data } : m));
  }, [setKnockoutMatches]);

  const deleteKnockoutMatch = useCallback((id: string) => {
    setKnockoutMatches(prev => prev.filter(m => m.id !== id));
  }, [setKnockoutMatches]);

  const getChampionshipKnockoutMatches = useCallback((championshipId: string) => {
    return knockoutMatches.filter(m => m.championshipId === championshipId);
  }, [knockoutMatches]);

  return {
    championships,
    teams,
    matches,
    rounds,
    gameDays,
    knockoutMatches,
    createChampionship,
    updateChampionship,
    deleteChampionship,
    getChampionship,
    createTeam,
    updateTeam,
    deleteTeam,
    getTeam,
    addTeamToChampionship,
    removeTeamFromChampionship,
    getChampionshipTeams,
    getTeamsNotInChampionship,
    createGameDay,
    updateGameDay,
    deleteGameDay,
    getChampionshipGameDays,
    addTeamToGameDay,
    removeTeamFromGameDay,
    getGameDayTeams,
    createRound,
    updateRound,
    deleteRound,
    getChampionshipRounds,
    createMatch,
    updateMatch,
    deleteMatch,
    getChampionshipMatches,
    getRoundMatches,
    createKnockoutMatch,
    updateKnockoutMatch,
    deleteKnockoutMatch,
    getChampionshipKnockoutMatches,
  };
}
