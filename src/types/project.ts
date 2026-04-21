export type ProjectStatus = "in_development" | "finished" | "maintenance" | "planning";
export type TechnologyLevel = "low" | "mid" | "high" | "very_high";
export type CategoryType = "cloud" | "database" | "frontend" | "languages" | "frameworks" | "devops/ci-cd";

export interface Technology {
  id: number;
  name: string;
  icon_url: string | null;
  level: TechnologyLevel;
  experience_start_date: string;
  category: CategoryType;
}

export interface Link {
  id: number;
  project_id: number;
  label: string;
  url: string;
}

export interface Project {
  id: number;
  name: string;
  cover_img: string;
  description: string;
  bucket_folder: string;
  status: ProjectStatus;
  company_name: string;
  priority_order: number;
  launch_date: string | null;
  technologies?: Technology[];
  links?: Link[];
}

export interface ProjectTechnology {
  project_id: number;
  technology_id: number;
}
