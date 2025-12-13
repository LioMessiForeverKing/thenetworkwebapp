export interface AriaMessage {
    id?: string;
    content: string;
    isFromUser: boolean;
    createdAt: string;
    candidates?: RecommendationCandidate[];
}

export interface RecommendationCandidate {
    id: string;
    name: string;
    username: string;
    headline?: string;
    matchScore: number;
    matchReason?: string;
    avatarUrl?: string;
    isConnected?: boolean;
    isPending?: boolean;
}

export interface AriaResponse {
    response: string | null;
    intent: string;
    candidates: RecommendationCandidate[];
}
