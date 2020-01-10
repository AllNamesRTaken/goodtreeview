/// <reference path="../node_modules/goodcore/goodcore_global.iife.d.ts" />

import { TreeView } from "./TreeView";
import { TableView } from "./TableView";
import { randomInt } from "goodcore/MocData";
import { create } from "goodcore/Arr";

type RowKind = "h" | "d" | "s";
type ColKind = "h" | "d" | "s" | "0";

export interface RowData {
    kind: RowKind;
    collapsed?: "off" | "collapsed" | "expanded";
    col: ColInfo[];
    data: any[];
}
export interface ColInfo {
    kind: ColKind;
    data: any;
}

//TODO: Decide on data structure for ColInfo, RowInfo and CellData

interface ITreeData { id: string, parent: string | null, data: RowData };
let treeData: ITreeData[] = [
    { id: "root", parent: null, data: { row: {kind: "h" as RowKind, name: "root", collapsed: "expanded"}, col: {}, data: create(10, () => randomInt(-1000, 1000) ) } },
    { id: "n1", parent: "root", data: { kind: "h" as RowKind, collapsed: "expanded", data: create(10, () => randomInt(-1000, 1000) ) } },
    { id: "n2", parent: "root", data: { kind: "h" as RowKind, collapsed: "collapsed", data: create(10, () => randomInt(-1000, 1000) ) } },
    { id: "n3", parent: "n1", data: { kind: "d" as RowKind, collapsed: "off", data: create(10, () => randomInt(-1000, 1000) ) } },
    { id: "n4", parent: "n1", data: { kind: "d" as RowKind, collapsed: "off", data: create(10, () => randomInt(-1000, 1000) ) } },
    { id: "n5", parent: "n2", data: { kind: "d" as RowKind, collapsed: "off", data: create(10, () => randomInt(-1000, 1000) ) } },
];
for(let i = 0; i < 1000; i++) {
    treeData.push({ id: "dyn"+i, parent: "n2", data: { kind: "d" as RowKind, collapsed: "off", data: create(10, () => randomInt(-1000, 1000) ) } })
}
let myTree = Tree.fromNodeList<ITreeData, RowData>(treeData, {id: "id"});
(window as any).myTree = myTree;

// /* TREEVIEW TEST */
// let treeview = new TreeView({
//     id: "mytree", 
//     tree: myTree, 
//     renderer: (subtree, childViews) => lighterhtml.html`
//         <span class=${["innerdesc", "tree_" + subtree.data?.kind].join(" ")} data-kind=${subtree.data?.kind} >${subtree.id}</span>
//         ${childViews}
//     `,
//     onclick: (subtree, event) => {
//         console.log("click", subtree.id, (event as MouseEvent).button);
//         return false;
//     },
//     onpress: (subtree, event) => {
//         console.log("press", subtree.id, (event as MouseEvent).button);
//         return false;
//     },
//     ondrop: (subtree, event ) => {
//         console.log("ondrop", subtree.id);
//     },
//     onfocus: (subtree, event? ) => {
//         console.log("onfocus", subtree.id);
//     },
//     isContainer: (subtree) => subtree.data?.kind === "frame",
//     getCollapseState: (subtree) => subtree.data?.collapsed ?? "off",
// });
// treeview.render(document.body);
// (window as any).treeview = treeview;

/* TABLEVIEW TEST */

// function renderRow<T>(subtree: Tree<T>) {
//     return ((subtree.data as any).data as number[]).map((data,i) => lighterhtml.html`<td id=${subtree.id + "_" + i} class="tv-col">${data}</td`)
// }

let tableview = new TableView({
    id: "mytree", 
    tree: myTree, 
    // renderer: (subtree) => lighterhtml.html`
    //     <tv-col class=${["innerdesc", "tree_" + subtree.data?.kind].join(" ")} data-kind=${subtree.data?.kind} >${renderRow(subtree)}</span>
    // `,
    onclick: (subtree, event) => {
        console.log("click", subtree.id, (event as MouseEvent).button);
        return false;
    },
    onpress: (subtree, event) => {
        console.log("press", subtree.id, (event as MouseEvent).button);
        return false;
    },
    onfocus: (subtree, event? ) => {
        console.log("onfocus", subtree.id);
    },
    getCollapseState: (subtree) => subtree.data?.collapsed ?? "off",
});
tableview.render(document.body);
(window as any).tableview = tableview;