import { Team, Match, TeamStats } from '@/types/championship';

export function calculateStandings(teams: Team[], matches: Match[]): TeamStats[] {
  const statsMap = new Map<string, TeamStats>();

  // Initialize stats for all teams
  teams.forEach(team => {
    statsMap.set(team.id, {
      teamId: team.id,
      team,
      points: 0,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      gaveWO: false,
      woCount: 0,
      pointsPercentage: 0,
    });
  });

  // Process matches with W.O. or played scores
  matches.forEach(match => {
    const homeStats = statsMap.get(match.homeTeamId);
    const awayStats = statsMap.get(match.awayTeamId);

    if (!homeStats || !awayStats) return;

    // Handle W.O. cases first
    if (match.homeWO) {
      homeStats.played++;
      awayStats.played++;
      homeStats.goalsAgainst += 3;
      awayStats.goalsFor += 3;
      awayStats.won++;
      awayStats.points += 3;
      homeStats.lost++;
      homeStats.gaveWO = true;
      homeStats.woCount++;
      return;
    }
    
    if (match.awayWO) {
      homeStats.played++;
      awayStats.played++;
      homeStats.goalsFor += 3;
      awayStats.goalsAgainst += 3;
      homeStats.won++;
      homeStats.points += 3;
      awayStats.lost++;
      awayStats.gaveWO = true;
      awayStats.woCount++;
      return;
    }

    // Skip if no score recorded
    if (match.homeGoals === null || match.awayGoals === null) {
      return;
    }

    const homeGoals = match.homeGoals;
    const awayGoals = match.awayGoals;

    // Update played matches
    homeStats.played++;
    awayStats.played++;

    // Update goals
    homeStats.goalsFor += homeGoals;
    homeStats.goalsAgainst += awayGoals;
    awayStats.goalsFor += awayGoals;
    awayStats.goalsAgainst += homeGoals;

    // Calculate result and update points
    if (homeGoals > awayGoals) {
      homeStats.won++;
      homeStats.points += 3;
      awayStats.lost++;
    } else if (awayGoals > homeGoals) {
      awayStats.won++;
      awayStats.points += 3;
      homeStats.lost++;
    } else {
      homeStats.drawn++;
      awayStats.drawn++;
      homeStats.points += 1;
      awayStats.points += 1;
    }
  });

  // Calculate goal difference
  statsMap.forEach(stats => {
    stats.goalDifference = stats.goalsFor - stats.goalsAgainst;
    const maxPoints = stats.played * 3;
    stats.pointsPercentage = maxPoints > 0 ? (stats.points / maxPoints) * 100 : 0;
  });

  // Sort teams based on tiebreaker rules
  const standings = Array.from(statsMap.values());

  return standings.sort((a, b) => {
    // 1. Points (descending)
    if (a.points !== b.points) {
      return b.points - a.points;
    }

    // 2. More victories (descending)
    if (a.won !== b.won) {
      return b.won - a.won;
    }

    // 3. Didn't give W.O. (teams without W.O. come first)
    if (a.gaveWO !== b.gaveWO) {
      return a.gaveWO ? 1 : -1;
    }

    // 4. Fewer goals conceded (ascending - less is better)
    if (a.goalsAgainst !== b.goalsAgainst) {
      return a.goalsAgainst - b.goalsAgainst;
    }

    // 5. Goal difference (descending)
    if (a.goalDifference !== b.goalDifference) {
      return b.goalDifference - a.goalDifference;
    }

    // 6. Head-to-head (check direct confrontation)
    const headToHead = getHeadToHeadResult(a.teamId, b.teamId, matches);
    if (headToHead !== 0) {
      return headToHead;
    }

    // Final tiebreaker: alphabetical by team name
    return a.team.name.localeCompare(b.team.name);
  });
}

function getHeadToHeadResult(teamAId: string, teamBId: string, matches: Match[]): number {
  let teamAPoints = 0;
  let teamBPoints = 0;

  matches.forEach(match => {
    const isTeamAHome = match.homeTeamId === teamAId && match.awayTeamId === teamBId;
    const isTeamAAway = match.homeTeamId === teamBId && match.awayTeamId === teamAId;

    if (!isTeamAHome && !isTeamAAway) return;

    // Handle W.O. cases
    if (match.homeWO) {
      if (isTeamAHome) teamBPoints += 3;
      else teamAPoints += 3;
      return;
    }
    if (match.awayWO) {
      if (isTeamAHome) teamAPoints += 3;
      else teamBPoints += 3;
      return;
    }

    if (match.homeGoals === null || match.awayGoals === null) return;

    const homeGoals = match.homeGoals;
    const awayGoals = match.awayGoals;

    if (isTeamAHome) {
      if (homeGoals > awayGoals) teamAPoints += 3;
      else if (homeGoals < awayGoals) teamBPoints += 3;
      else { teamAPoints += 1; teamBPoints += 1; }
    } else {
      if (awayGoals > homeGoals) teamAPoints += 3;
      else if (awayGoals < homeGoals) teamBPoints += 3;
      else { teamAPoints += 1; teamBPoints += 1; }
    }
  });

  if (teamAPoints > teamBPoints) return -1;
  if (teamBPoints > teamAPoints) return 1;
  return 0;
}
