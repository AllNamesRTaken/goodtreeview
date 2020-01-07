/// <reference path="../node_modules/goodcore/goodcore_global.iife.d.ts" />
import { TreeView } from "./TreeView";

type Kind = "frame" | "control";
export interface NodeData {
  kind: Kind;
  collapsed?: "off" | "collapsed" | "expanded";
}

interface ITreeData { id: string, parent: string | null, data: { kind: Kind } };
let treeData = [
    { id: "root", parent: null, data: { kind: "frame" as Kind, collapsed: "expanded" } },
    { id: "n1", parent: "root", data: { kind: "frame" as Kind, collapsed: "expanded" } },
    { id: "n2", parent: "root", data: { kind: "frame" as Kind, collapsed: "collapsed" } },
    { id: "n3", parent: "n1", data: { kind: "control" as Kind, collapsed: "off" } },
    { id: "n4", parent: "n1", data: { kind: "control" as Kind, collapsed: "off" } },
    { id: "n5", parent: "n2", data: { kind: "control" as Kind, collapsed: "off" } },
];
for(let i = 0; i < 1000; i++) {
    treeData.push({ id: "dyn"+i, parent: "n2", data: { kind: "control" as Kind, collapsed: "off" } })
}
let myTree = Tree.fromNodeList<ITreeData, NodeData>(treeData, {id: "id"});
function rowRenderer<T>(subtree: Tree<T>) {
    let template = lighterhtml.html`<span class='tv-col'>${subtree.id}</span>`;
    return lighterhtml.html`${[0,1,2,3,4,5,6,7,8,9].map(() => template)}`;
}
let view = new TreeView({
    id: "mytree", 
    tree: myTree, 
    renderer: (subtree, childViews) => lighterhtml.html`
        <span class=${["innerdesc", "tree_" + subtree.data?.kind].join(" ")} data-kind=${subtree.data?.kind} >${rowRenderer(subtree)}</span>
        ${childViews}
    `,
    onclick: (subtree, event) => {
        console.log("click", subtree.id, (event as MouseEvent).button);
        return false;
    },
    onpress: (subtree, event) => {
        console.log("press", subtree.id, (event as MouseEvent).button);
        return false;
    },
    ondrop: (subtree, event ) => {
        console.log("ondrop", subtree.id);
    },
    onfocus: (subtree, event? ) => {
        console.log("onfocus", subtree.id);
    },
    isContainer: (subtree) => subtree.data?.kind === "frame",
    getCollapseState: (subtree) => subtree.data?.collapsed ?? "off",
});
view.render(document.body);
(window as any).myTree = myTree;
(window as any).view = view;
