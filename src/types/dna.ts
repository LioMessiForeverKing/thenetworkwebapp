export interface DigitalDna {
    summary: string;
    tags: string[];
    interests: string[];
}

export interface InterestNode {
    id: string;
    label: string;
    x: number;
    y: number;
    size: number;
    color: string;
}
