import React, { useState } from "react";
import { Box, Fab, styled } from "@mui/material";
import { Place, ViewList } from "@mui/icons-material";
import { PlayerPageHeader } from "./PlayerPageHeader";
import { useFilteredSortedPlayers } from "../../state/players.state";
import { PlayersListEmpty } from "./PlayersListEmpty";
import { PlayersListGrid } from "./PlayersListGrid";
import { usePlayerListListener } from "../../hooks/usePlayerListListener";
import { PlayersMap } from "./PlayersMap";
import { useIsRedmValue } from "../../state/isRedm.state";

const RootStyled = styled(Box)(({ theme }) => ({
  backgroundColor: theme.palette.background.default,
  height: "50vh",
  borderRadius: 15,
  position: "relative",
  flex: 1,
}));

const GridStyled = styled(Box)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  height: "85%",
}));

export const PlayersPage: React.FC<{ visible: boolean }> = ({ visible }) => {
  const players = useFilteredSortedPlayers();
  const isRedm = useIsRedmValue();
  const [showMap, setShowMap] = useState(false);

  usePlayerListListener(showMap ? 2500 : 5000);

  return (
    <RootStyled
      mt={2}
      mb={10}
      pt={4}
      px={4}
      display={visible ? "initial" : "none"}
    >
      <PlayerPageHeader />
      <GridStyled>
        {showMap ? <PlayersMap /> : players.length ? <PlayersListGrid /> : <PlayersListEmpty />}
      </GridStyled>
      {!isRedm && (
        <Fab
          color="primary"
          size="medium"
          aria-label={showMap ? "List" : "Map"}
          onClick={() => setShowMap((v) => !v)}
          sx={{ position: "absolute", right: 24, bottom: 24 }}
        >
          {showMap ? <ViewList /> : <Place />}
        </Fab>
      )}
    </RootStyled>
  );
};
