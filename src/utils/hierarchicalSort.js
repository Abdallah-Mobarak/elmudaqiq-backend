/**
 * Sorts an array of objects hierarchically based on a string/number identifier key.
 * Handles tree structuring and flattening for correct hierarchical pagination.
 * 
 * @param {Array} data - The array of objects to sort.
 * @param {String} keyName - The name of the property to build the tree upon (e.g., "accountNumber", "number").
 * @returns {Array} - The sorted, flattened array.
 */
function hierarchicalSort(data, keyName = "accountNumber") {
  if (!data || data.length === 0) return [];

  // Step 1: Convert each item to a node
  const nodes = data.map(item => ({
    ...item,
    children: [],
    _key: String(item[keyName] || "") 
  }));

  // Step 2: Create a map for quick parent lookup
  const nodeMap = new Map();
  nodes.forEach(node => {
    const key = node._key;
    if (!nodeMap.has(key)) nodeMap.set(key, []);
    nodeMap.get(key).push(node);
  });

  // Step 3: Link each element to its closest parent
  const roots = [];
  nodes.forEach(node => {
    let parentFound = false;
    const key = node._key;

    for (let i = key.length - 1; i > 0; i--) {
      const parentKey = key.slice(0, i);
      if (nodeMap.has(parentKey)) {
        const parents = nodeMap.get(parentKey);
        if (parents.length > 0) {
          parents[0].children.push(node);
          parentFound = true;
          break;
        }
      }
    }

    if (!parentFound) roots.push(node);
  });

  // Step 4: Sort each level
  function sortTree(nodes) {
    nodes.sort((a, b) => {
      const aVal = String(a[keyName] || "");
      const bVal = String(b[keyName] || "");
      
      if (aVal.length !== bVal.length) return aVal.length - bVal.length;
      
      const numCompare = aVal.localeCompare(bVal, undefined, { numeric: true });
      if (numCompare !== 0) return numCompare;
      
      return a.id - b.id; // stable sort
    });
    nodes.forEach(n => sortTree(n.children));
  }
  sortTree(roots);

  // Step 5: Flatten the tree into a single array
  const result = [];
  function flatten(nodes) {
    nodes.forEach(n => { const { children, _key, ...rest } = n; result.push(rest); flatten(children); });
  }
  flatten(roots);
  return result;
}

module.exports = hierarchicalSort;