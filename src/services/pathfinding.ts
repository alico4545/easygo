import {BuildingMap, BuildingNode, RouteResult, RouteStep} from '../types/navigation';

type EdgeWithDirection = RouteStep;

const buildAdjacency = (map: BuildingMap): Record<string, EdgeWithDirection[]> => {
  const adjacency: Record<string, EdgeWithDirection[]> = {};
  const nodeMap = getNodeMap(map);

  for (const edge of map.edges) {
    if (!adjacency[edge.from]) {
      adjacency[edge.from] = [];
    }
    if (!adjacency[edge.to]) {
      adjacency[edge.to] = [];
    }

    adjacency[edge.from].push({...edge});
    adjacency[edge.to].push({
      from: edge.to,
      to: edge.from,
      steps: edge.steps,
      instruction: `${nodeMap[edge.from]?.name ?? edge.from} yönüne ilerleyin.`,
    });
  }

  return adjacency;
};

const getNodeMap = (map: BuildingMap): Record<string, BuildingNode> => {
  return map.nodes.reduce<Record<string, BuildingNode>>((acc, node) => {
    acc[node.id] = node;
    return acc;
  }, {});
};

export const findShortestRoute = (
  map: BuildingMap,
  startNodeId: string,
  targetNodeId: string,
): RouteResult | null => {
  if (startNodeId === targetNodeId) {
    const node = map.nodes.find(n => n.id === startNodeId);
    if (!node) {
      return null;
    }
    return {nodes: [node], steps: [], totalSteps: 0};
  }

  const adjacency = buildAdjacency(map);
  const nodeMap = getNodeMap(map);

  const distances: Record<string, number> = {};
  const previous: Record<string, EdgeWithDirection | null> = {};
  const unvisited = new Set<string>(map.nodes.map(node => node.id));

  for (const node of map.nodes) {
    distances[node.id] = Number.POSITIVE_INFINITY;
    previous[node.id] = null;
  }

  distances[startNodeId] = 0;

  while (unvisited.size > 0) {
    let currentNodeId: string | null = null;
    let currentDistance = Number.POSITIVE_INFINITY;

    for (const nodeId of unvisited) {
      if (distances[nodeId] < currentDistance) {
        currentDistance = distances[nodeId];
        currentNodeId = nodeId;
      }
    }

    if (!currentNodeId || currentDistance === Number.POSITIVE_INFINITY) {
      break;
    }

    unvisited.delete(currentNodeId);

    if (currentNodeId === targetNodeId) {
      break;
    }

    const neighbors = adjacency[currentNodeId] ?? [];
    for (const edge of neighbors) {
      if (!unvisited.has(edge.to)) {
        continue;
      }

      const candidateDistance = distances[currentNodeId] + edge.steps;
      if (candidateDistance < distances[edge.to]) {
        distances[edge.to] = candidateDistance;
        previous[edge.to] = edge;
      }
    }
  }

  if (!previous[targetNodeId]) {
    return null;
  }

  const routeSteps: RouteStep[] = [];
  let cursor: string | null = targetNodeId;

  while (cursor && cursor !== startNodeId) {
    const edge = previous[cursor];
    if (!edge) {
      break;
    }
    routeSteps.unshift(edge);
    cursor = edge.from;
  }

  const routeNodeIds = [startNodeId, ...routeSteps.map(step => step.to)];
  const routeNodes = routeNodeIds
    .map(nodeId => nodeMap[nodeId])
    .filter(Boolean) as BuildingNode[];

  return {
    nodes: routeNodes,
    steps: routeSteps,
    totalSteps: routeSteps.reduce((sum, step) => sum + step.steps, 0),
  };
};
