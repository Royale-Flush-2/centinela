resource "aws_apprunner_vpc_connector" "connector" {
  vpc_connector_name = "${var.app_name}-vpc-connector"
  subnets            = module.vpc.private_subnets
  security_groups    = [aws_security_group.apprunner.id]
}
