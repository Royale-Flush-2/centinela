#!/bin/bash
for file in .github/workflows/deploy-*.yml; do
  service_name=$(grep "service_name:" "$file" | awk -F"'" '{print $2}')
  
  if [ -z "$service_name" ]; then continue; fi
  
  service_path="services/$(echo $service_name | tr '-' '_')"
  if [ "$service_name" = "knowledge-service" ]; then service_path="services/knowledge-service"; fi
  if [ "$service_name" = "postgres-mcp" ]; then service_path="services/postgres-mcp"; fi
  
  # Find ecr_repo_name from terraform variables
  ecr_repo_name=$(grep -E '^\s*default\s*=\s*".*"' $service_path/terraform/variables.tf | grep -B 3 "app_name" -A 1 | grep "default" | awk -F'"' '{print $2}')
  if [ -z "$ecr_repo_name" ]; then
    ecr_repo_name=$(cat $service_path/terraform/variables.tf | grep -A 3 "variable \"app_name\"" | grep "default" | awk -F'"' '{print $2}')
  fi
  
  # Find ecr_resource_name from terraform main.tf
  ecr_resource_name=$(grep "resource \"aws_ecr_repository\"" $service_path/terraform/main.tf | awk -F'"' '{print $4}')
  
  # Update the workflow file
  sed -i '' "/service_path:/a\\
\\      ecr_repo_name: '$ecr_repo_name'\\
\\      ecr_resource_name: '$ecr_resource_name'
  " "$file"
done
