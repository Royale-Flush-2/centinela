resource "random_password" "db_password" {
  length  = 16
  special = false
}

module "db" {
  source  = "terraform-aws-modules/rds/aws"
  version = "~> 6.0"

  identifier = "${var.app_name}-db"

  engine               = "postgres"
  engine_version       = "16"
  family               = "postgres16"
  major_engine_version = "16"
  instance_class       = "db.t4g.micro"

  allocated_storage     = 20
  max_allocated_storage = 100

  db_name  = "centinela"
  username = "strategist"
  port     = 5432
  password = random_password.db_password.result

  manage_master_user_password = false

  vpc_security_group_ids = [aws_security_group.db.id]
  db_subnet_group_name   = module.vpc.database_subnet_group_name
  subnet_ids             = module.vpc.private_subnets

  create_db_subnet_group = true

  backup_retention_period = 7
  skip_final_snapshot     = true
  deletion_protection     = false

  tags = {
    Environment = "production"
    Project     = var.app_name
  }
}

resource "aws_security_group" "db" {
  name        = "${var.app_name}-db-sg"
  description = "Security group for RDS instance"
  vpc_id      = module.vpc.vpc_id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.apprunner.id]
  }
}

resource "aws_security_group" "apprunner" {
  name        = "${var.app_name}-apprunner-sg"
  description = "Security group for App Runner VPC Connector"
  vpc_id      = module.vpc.vpc_id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
