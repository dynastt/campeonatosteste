import { TeamStats } from '@/types/championship';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Trophy, Medal, FileText } from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface StandingsTableProps {
  standings: TeamStats[];
  title?: string;
  championshipName?: string;
  showExport?: boolean;
  qualifyingCount?: number;
  sortByPercentage?: boolean;
}

const StandingsTable = ({ standings, title = 'Classificação', championshipName, showExport = true, qualifyingCount, sortByPercentage = false }: StandingsTableProps) => {
  if (standings.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhum time cadastrado
      </div>
    );
  }

  // Re-sort by percentage if needed
  const sortedStandings = sortByPercentage
    ? [...standings].sort((a, b) => {
        if (b.pointsPercentage !== a.pointsPercentage) return b.pointsPercentage - a.pointsPercentage;
        if (a.won !== b.won) return b.won - a.won;
        if (a.gaveWO !== b.gaveWO) return a.gaveWO ? 1 : -1;
        if (a.goalsAgainst !== b.goalsAgainst) return a.goalsAgainst - b.goalsAgainst;
        if (a.goalDifference !== b.goalDifference) return b.goalDifference - a.goalDifference;
        return a.team.name.localeCompare(b.team.name);
      })
    : standings;

  const handleExportPDF = () => {
    const doc = new jsPDF();
    
    // Championship name large
    const displayName = championshipName || title;
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    const nameLines = doc.splitTextToSize(displayName, 180);
    doc.text(nameLines, 105, 22, { align: 'center' });
    
    const nameEndY = 22 + (nameLines.length * 10);
    
    // Subtitle
    if (championshipName && title !== championshipName) {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'normal');
      doc.text(title, 105, nameEndY + 4, { align: 'center' });
    }
    
    // Date
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const dateY = championshipName && title !== championshipName ? nameEndY + 12 : nameEndY + 4;
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} as ${new Date().toLocaleTimeString('pt-BR')}`, 14, dateY);
    
    // Table data
    const usePerc = sortByPercentage;
    const headers = [['#', 'Time', usePerc ? '%' : 'P', 'J', 'V', 'E', 'D', 'GP', 'GC', 'SG']];
    const rows = sortedStandings.map((stat, index) => [
      (index + 1).toString(),
      stat.team.name + (stat.gaveWO ? ' (W.O.)' : ''),
      usePerc ? stat.pointsPercentage.toFixed(1) + '%' : stat.points.toString(),
      stat.played.toString(),
      stat.won.toString(),
      stat.drawn.toString(),
      stat.lost.toString(),
      stat.goalsFor.toString(),
      stat.goalsAgainst.toString(),
      (stat.goalDifference > 0 ? '+' : '') + stat.goalDifference.toString()
    ]);

    autoTable(doc, {
      head: headers,
      body: rows,
      startY: dateY + 6,
      theme: 'striped',
      headStyles: {
        fillColor: [34, 197, 94],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center',
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 10 },
        1: { halign: 'left', cellWidth: 50 },
        2: { halign: 'center', cellWidth: 15, fontStyle: 'bold' },
        3: { halign: 'center', cellWidth: 15 },
        4: { halign: 'center', cellWidth: 15 },
        5: { halign: 'center', cellWidth: 15 },
        6: { halign: 'center', cellWidth: 15 },
        7: { halign: 'center', cellWidth: 15 },
        8: { halign: 'center', cellWidth: 15 },
        9: { halign: 'center', cellWidth: 15 },
      },
      styles: { fontSize: 9, cellPadding: 3 },
      alternateRowStyles: { fillColor: [245, 245, 245] },
    });
    
    const finalY = (doc as any).lastAutoTable.finalY || 100;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Legenda: P = Pontos, J = Jogos, V = Vitorias, E = Empates, D = Derrotas, GP = Gols Pro, GC = Gols Contra, SG = Saldo de Gols', 14, finalY + 10);
    doc.text('Criterios de desempate: 1 Vitorias, 2 Nao ter dado W.O., 3 Menos gols sofridos, 4 Saldo de gols, 5 Confronto direto', 14, finalY + 16);
    
    doc.save(`${title.toLowerCase().replace(/\s+/g, '-')}.pdf`);
    toast.success('Classificação exportada em PDF!');
  };

  return (
    <div className="space-y-4">
      {showExport && (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" className="gap-2" onClick={handleExportPDF}>
            <FileText className="h-4 w-4" />
            Exportar PDF
          </Button>
        </div>
      )}
      
      <div className="overflow-x-auto rounded-xl border border-border/50">
        {title && <h3 className="sr-only">{title}</h3>}
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              <TableHead className="w-12 text-center font-semibold">#</TableHead>
              <TableHead className="font-semibold">Time</TableHead>
              <TableHead className="text-center w-14 font-semibold">{sortByPercentage ? '%' : 'P'}</TableHead>
              <TableHead className="text-center w-14 font-semibold hidden sm:table-cell">J</TableHead>
              <TableHead className="text-center w-14 font-semibold hidden sm:table-cell">V</TableHead>
              <TableHead className="text-center w-14 font-semibold hidden sm:table-cell">E</TableHead>
              <TableHead className="text-center w-14 font-semibold hidden sm:table-cell">D</TableHead>
              <TableHead className="text-center w-14 font-semibold hidden md:table-cell">GP</TableHead>
              <TableHead className="text-center w-14 font-semibold hidden md:table-cell">GC</TableHead>
              <TableHead className="text-center w-14 font-semibold">SG</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedStandings.map((stat, index) => {
              const isQualifying = qualifyingCount !== undefined && index < qualifyingCount;
              
              return (
                <TableRow 
                  key={stat.teamId} 
                  className={`transition-colors hover:bg-muted/50 ${isQualifying ? 'bg-green-500/10 hover:bg-green-500/15' : ''}`}
                >
                  <TableCell className="text-center">
                    {index === 0 && (
                      <div className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-gradient-accent shadow-sm">
                        <Trophy className="h-4 w-4 text-accent-foreground" />
                      </div>
                    )}
                    {index === 1 && (
                      <div className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-gray-300 dark:bg-gray-600 shadow-sm">
                        <Medal className="h-4 w-4 text-gray-700 dark:text-gray-200" />
                      </div>
                    )}
                    {index === 2 && (
                      <div className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-amber-700 shadow-sm">
                        <Medal className="h-4 w-4 text-amber-100" />
                      </div>
                    )}
                    {index > 2 && (
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-muted text-muted-foreground text-sm font-medium">
                        {index + 1}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 sm:gap-3">
                      {stat.team.logo ? (
                        <img src={stat.team.logo} alt={stat.team.name} className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg object-cover" />
                      ) : (
                        <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg bg-gradient-primary/10 flex items-center justify-center text-xs sm:text-sm font-bold text-primary">
                          {stat.team.name.charAt(0)}
                        </div>
                      )}
                      <span className="font-medium text-sm sm:text-base truncate max-w-[100px] sm:max-w-none">{stat.team.name}</span>
                      {stat.gaveWO && (
                        <Badge variant="destructive" className="text-xs gap-1 hidden sm:flex">
                          <AlertTriangle className="h-3 w-3" />
                          W.O.
                        </Badge>
                      )}
                      {isQualifying && (
                        <span className="h-2 w-2 rounded-full bg-green-500 flex-shrink-0" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center font-bold text-primary text-lg">
                    {sortByPercentage ? `${stat.pointsPercentage.toFixed(0)}%` : stat.points}
                  </TableCell>
                  <TableCell className="text-center hidden sm:table-cell">{stat.played}</TableCell>
                  <TableCell className="text-center hidden sm:table-cell">{stat.won}</TableCell>
                  <TableCell className="text-center text-muted-foreground hidden sm:table-cell">{stat.drawn}</TableCell>
                  <TableCell className="text-center hidden sm:table-cell">{stat.lost}</TableCell>
                  <TableCell className="text-center hidden md:table-cell">{stat.goalsFor}</TableCell>
                  <TableCell className="text-center hidden md:table-cell">{stat.goalsAgainst}</TableCell>
                  <TableCell className={`text-center font-medium ${stat.goalDifference > 0 ? 'text-green-600 dark:text-green-400' : stat.goalDifference < 0 ? 'text-red-600 dark:text-red-400' : ''}`}>
                    {stat.goalDifference > 0 ? '+' : ''}{stat.goalDifference}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div className="text-xs text-muted-foreground space-y-1 px-1">
        <p><strong>Legenda:</strong> {sortByPercentage ? '% = Aproveitamento' : 'P = Pontos'}, J = Jogos, V = Vitórias, E = Empates, D = Derrotas, GP = Gols Pró, GC = Gols Contra, SG = Saldo de Gols</p>
        <p><strong>Critérios de desempate:</strong> 1º Vitórias, 2º Não ter dado W.O., 3º Menos gols sofridos, 4º Saldo de gols, 5º Confronto direto</p>
      </div>
    </div>
  );
};

export default StandingsTable;
