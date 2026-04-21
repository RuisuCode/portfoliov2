import { supabase } from "../../utils/supabase";
import type { Project } from "../types/project";

export async function fetchProjects(): Promise<Project[]> {
  try {
    // Obtener proyectos con sus tecnologías y enlaces
    const { data: projects, error: projectsError } = await supabase
      .from("projects")
      .select(`
        *,
        technologies:project_technologies(
          technology_id,
          technologies(
            id,
            name,
            icon_url,
            level,
            experience_start_date,
            category
          )
        ),
        links(
          id,
          label,
          url
        )
      `)
      .order("priority_order", { ascending: true });

    if (projectsError) {
      throw new Error(projectsError.message);
    }

    // Transformar los datos para que coincidan con las interfaces
    const transformedProjects: Project[] = (projects || []).map((project) => ({
      id: project.id,
      name: project.name,
      cover_img: project.cover_img,
      description: project.description,
      bucket_folder: project.bucket_folder,
      status: project.status,
      company_name: project.company_name,
      priority_order: project.priority_order,
      launch_date: project.launch_date,
      technologies: project.technologies?.map((pt) => pt.technologies).filter(Boolean) || [],
      links: project.links || []
    }));

    return transformedProjects;
  } catch (error) {
    console.error("Error fetching projects:", error);
    throw error;
  }
}
