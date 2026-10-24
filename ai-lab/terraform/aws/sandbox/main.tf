terraform {
  required_version = ">= 1.10"
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 6.0" }
  }
}

variable "region" { type = string }
variable "account_id" { type = string }
variable "owner" { type = string }

provider "aws" {
  region              = var.region
  allowed_account_ids = [var.account_id]   # refuse to run against any other account
  default_tags {
    tags = {
      project    = "ai-lab"
      owner      = var.owner
      managed-by = "terraform"
      stack      = "sandbox"
    }
  }
}

resource "aws_s3_bucket" "test" {
  bucket_prefix = "ai-lab-test-"   # AWS appends a unique suffix; bucket names are global
  force_destroy = true             # destroy also deletes objects inside
}

output "bucket" { value = aws_s3_bucket.test.bucket }