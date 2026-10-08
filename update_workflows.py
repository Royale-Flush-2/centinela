import os
import glob
import re

for file_path in glob.glob('.github/workflows/deploy-*.yml'):
    with open(file_path, 'r') as f:
        content = f.read()
    
    # Extract service_name
    match = re.search(r"service_name:\s*'([^']+)'", content)
    if not match:
        continue
    service_name = match.group(1)
    
    # Determine service_path
    if service_name == 'knowledge-service':
        service_path = 'services/knowledge-service'
    elif service_name == 'postgres-mcp':
        service_path = 'services/postgres-mcp'
    else:
        service_path = f"services/{service_name.replace('-', '_')}"
    
    # Extract ecr_repo_name
    with open(f"{service_path}/terraform/variables.tf", 'r') as f:
        vars_content = f.read()
        app_name_match = re.search(r'variable\s+"app_name"\s*{[^}]*default\s*=\s*"([^"]+)"', vars_content, re.MULTILINE)
        if not app_name_match:
            app_name_match = re.search(r'variable\s+"app_name"\s*{\s*default\s*=\s*"([^"]+)"', vars_content)
        ecr_repo_name = app_name_match.group(1)
        
    # Extract ecr_resource_name
    with open(f"{service_path}/terraform/main.tf", 'r') as f:
        main_content = f.read()
        resource_match = re.search(r'resource\s+"aws_ecr_repository"\s+"([^"]+)"', main_content)
        ecr_resource_name = resource_match.group(1)
        
    # Insert new inputs
    replacement = f"service_path: '{service_path}'\n      ecr_repo_name: '{ecr_repo_name}'\n      ecr_resource_name: '{ecr_resource_name}'"
    content = re.sub(f"service_path:\s*'{service_path}'", replacement, content, count=1)
    
    with open(file_path, 'w') as f:
        f.write(content)

print("Done")
