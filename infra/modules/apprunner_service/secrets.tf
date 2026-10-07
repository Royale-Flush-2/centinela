data "aws_iam_policy_document" "secrets_access" {
  count = length(var.secrets_map) > 0 ? 1 : 0
  statement {
    actions   = ["secretsmanager:GetSecretValue", "kms:Decrypt"]
    resources = values(var.secrets_map)
  }
}

resource "aws_iam_policy" "secrets_policy" {
  count  = length(var.secrets_map) > 0 ? 1 : 0
  name   = "${var.app_name}-secrets-policy"
  policy = data.aws_iam_policy_document.secrets_access[0].json
}

resource "aws_iam_role_policy_attachment" "secrets_attach" {
  count      = length(var.secrets_map) > 0 ? 1 : 0
  role       = aws_iam_role.apprunner_instance_role.name
  policy_arn = aws_iam_policy.secrets_policy[0].arn
}

