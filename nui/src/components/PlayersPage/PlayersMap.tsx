import React, { useLayoutEffect, useMemo, useRef, useState } from "react";
import { Box, Paper, styled } from "@mui/material";
import { useFilteredSortedPlayers } from "../../state/players.state";
import { PlayerData } from "../../hooks/usePlayerListListener";
import { useSetAssociatedPlayer } from "../../state/playerDetails.state";
import { useSetPlayerModalVisibility } from "../../state/playerModal.state";
import PlayerCard from "./PlayerCard";

const MAP_IMAGE = "images/map-satellite.jpg";
const MAP_ASPECT = 5944 / 8075;
const MAP_BOUNDS = { left: -3932, right: 5095, top: 8297, bottom: -3959 };
const toMapX = (x: number) => (x - MAP_BOUNDS.left) / (MAP_BOUNDS.right - MAP_BOUNDS.left);
const toMapY = (y: number) => (MAP_BOUNDS.top - y) / (MAP_BOUNDS.top - MAP_BOUNDS.bottom);

const MARKER_SIZE = 26;
const MERGE_DIST = MARKER_SIZE * 0.8;
const MIN_ZOOM = 1;
const MAX_ZOOM = 32;

type Marker = { x: number; y: number; player: PlayerData };
type Cluster = { x: number; y: number; players: PlayerData[] };

const getClusterLabel = (cluster: Cluster) => {
  if (cluster.players.length === 1) return cluster.players[0].id;
  return cluster.players.length >= 10 ? "9+" : cluster.players.length;
};

const clusterMarkers = (markers: Marker[], mergeDist: number): Cluster[] => {
  const parent = markers.map((_, i) => i);
  const root = (i: number): number => (parent[i] === i ? i : (parent[i] = root(parent[i])));
  for (let i = 0; i < markers.length; i++) {
    for (let j = i + 1; j < markers.length; j++) {
      if (Math.hypot(markers[i].x - markers[j].x, markers[i].y - markers[j].y) <= mergeDist) {
        parent[root(i)] = root(j);
      }
    }
  }
  const groups = new Map<number, Marker[]>();
  markers.forEach((m, i) => groups.set(root(i), [...(groups.get(root(i)) ?? []), m]));
  return [...groups.values()].map((g) => ({
    x: g.reduce((sum, m) => sum + m.x, 0) / g.length,
    y: g.reduce((sum, m) => sum + m.y, 0) / g.length,
    players: g.map((m) => m.player),
  }));
};

const MapRoot = styled(Box)(({ theme }) => ({
  position: "relative",
  flex: 1,
  minHeight: 0,
  marginBottom: theme.spacing(4),
  overflow: "hidden",
  borderRadius: 10,
  background: "#143d6b",
  cursor: "grab",
}));

const MarkerCircle = styled("div")(({ theme }) => ({
  position: "absolute",
  width: MARKER_SIZE,
  height: MARKER_SIZE,
  transform: "translate(-50%, -50%)",
  borderRadius: "50%",
  border: "2px solid #fff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 11,
  fontWeight: 700,
  color: theme.palette.primary.contrastText,
  background: theme.palette.primary.main,
  cursor: "pointer",
  boxShadow: "0 0 4px rgba(0,0,0,0.6)",
}));

const SideList = styled(Paper)({
  position: "absolute",
  top: 0,
  right: 0,
  width: 320,
  height: "100%",
  overflowY: "auto",
  cursor: "default",
});

export const PlayersMap: React.FC = () => {
  const players = useFilteredSortedPlayers();
  const setAssociatedPlayer = useSetAssociatedPlayer();
  const setModalOpen = useSetPlayerModalVisibility();
  const rootRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [view, setView] = useState({ zoom: MIN_ZOOM, x: 0, y: 0 });
  const [selected, setSelected] = useState<PlayerData[] | null>(null);

  useLayoutEffect(() => {
    const el = rootRef.current!;
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const fitHeight = Math.min(size.h, size.w / MAP_ASPECT);
  const mapH = fitHeight * view.zoom;
  const mapW = mapH * MAP_ASPECT;
  const clampView = (v: typeof view) => {
    const maxX = Math.max(0, (fitHeight * v.zoom * MAP_ASPECT - size.w) / 2);
    const maxY = Math.max(0, (fitHeight * v.zoom - size.h) / 2);
    return {
      zoom: v.zoom,
      x: Math.min(maxX, Math.max(-maxX, v.x)),
      y: Math.min(maxY, Math.max(-maxY, v.y)),
    };
  };
  const pan = clampView(view);
  const left = (size.w - mapW) / 2 + pan.x;
  const top = (size.h - mapH) / 2 + pan.y;

  const clusters = useMemo(() => {
    const markers = players
      .filter((p) => p.x !== undefined && p.y !== undefined)
      .map((p) => ({ x: toMapX(p.x!) * mapW, y: toMapY(p.y!) * mapH, player: p }));
    return clusterMarkers(markers, MERGE_DIST);
  }, [players, mapW, mapH]);

  const handleWheel = (e: React.WheelEvent) => {
    const rect = rootRef.current!.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, view.zoom * (e.deltaY < 0 ? 1.25 : 0.8)));
    const k = zoom / view.zoom;
    const newLeft = cx - (cx - left) * k;
    const newTop = cy - (cy - top) * k;
    setView(clampView({
      zoom,
      x: newLeft - (size.w - mapW * k) / 2,
      y: newTop - (size.h - mapH * k) / 2,
    }));
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    const dx = e.clientX - drag.current.x;
    const dy = e.clientY - drag.current.y;
    if (Math.abs(dx) + Math.abs(dy) > 3) drag.current.moved = true;
    drag.current.x = e.clientX;
    drag.current.y = e.clientY;
    setView((v) => clampView({ ...v, x: v.x + dx, y: v.y + dy }));
  };

  const handleClusterClick = (e: React.MouseEvent, cluster: Cluster) => {
    e.stopPropagation();
    if (drag.current?.moved) return;
    if (cluster.players.length > 1) return setSelected(cluster.players);
    setSelected(null);
    setAssociatedPlayer(cluster.players[0]);
    setModalOpen(true);
  };

  return (
    <MapRoot
      ref={rootRef}
      onWheel={handleWheel}
      onPointerDown={(e) => (drag.current = { x: e.clientX, y: e.clientY, moved: false })}
      onPointerMove={handlePointerMove}
      onPointerUp={() => setTimeout(() => (drag.current = null))}
      onPointerLeave={() => (drag.current = null)}
      onClick={() => !drag.current?.moved && setSelected(null)}
    >
      <img
        src={MAP_IMAGE}
        alt=""
        draggable={false}
        style={{ position: "absolute", left, top, width: mapW, height: mapH }}
      />
      {clusters.map((c) => (
        <MarkerCircle
          key={c.players.map((p) => p.id).join(",")}
          style={{
            left: left + c.x,
            top: top + c.y,
            ...(c.players.length > 1 && { background: "#e65100" }),
          }}
          title={c.players.map((p) => `${p.id} | ${p.displayName}`).join("\n")}
          onClick={(e) => handleClusterClick(e, c)}
        >
          {getClusterLabel(c)}
        </MarkerCircle>
      ))}
      {selected && (
        <SideList
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          onWheel={(e) => e.stopPropagation()}
        >
          {selected.map((p) => (
            <PlayerCard playerData={p} key={p.id} />
          ))}
        </SideList>
      )}
    </MapRoot>
  );
};
