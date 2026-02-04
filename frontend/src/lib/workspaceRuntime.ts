let _workspaceId: string | null = null;

export function setRuntimeWorkspaceId(id: string | null) {
    _workspaceId = id;
}

export function getRuntimeWorkspaceId(): string | null {
    return _workspaceId;
}

export function clearRuntimeWorkspaceId() {
    _workspaceId = null;
}
