
export interface Winner {
  party: string;
  areaID: number;
  name: string;
  score: number;
}

export interface Candidate {
  logoURL: string;
  fullname: string;
  party_name: string;
  totalVotes: number;
  province: string;
  zone: number;
}

export interface Color {
  ID: number;
  PARTY_NAME: string;
  COLOR: string;
  IMG: string;
}