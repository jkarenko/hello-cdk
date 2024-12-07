# Hello CDK Stack

This repository contains two versions of the **Hello CDK Stack**, designed for different networking configurations and use cases.

## Versions

### **1. VPC Endpoints Version**
- **Description**:
  - Utilizes VPC Interface Endpoints for secure, private communication with AWS services (e.g., ECR, CloudWatch Logs) within the VPC.
  - Keeps all network traffic within the AWS network backbone, enhancing security and reducing internet exposure.
  - Suitable for use cases requiring stricter security and private connections.
- **Trade-offs**:
  - Fixed costs for VPC endpoints (~$7/month per endpoint).
  - Requires additional setup for VPC endpoint configurations.
  - Costs may exceed NAT gateway (not featured in this project at this time) costs for high number of endpoints.
  - Outbound data transfer costs within AWS are generally lower than when using public internet access.
    - Can be more cost effective for high volume use cases.

See [AWS PrivateLink Pricing](https://aws.amazon.com/privatelink/pricing/) for detailed costs:

#### Diagram
```mermaid
flowchart TB
    INTERNET((Internet)) -->|HTTP/HTTPS| ALB
    
    subgraph VPC["VPC (2 AZs, No NAT)"]
        direction TB
        style VPC fill:#F2F3F4,stroke:#232F3E,stroke-width:2px
        
        subgraph PublicSubnets["Public Subnets"]
            direction LR
            style PublicSubnets fill:#FF9900,stroke:#232F3E
            ALB[Application Load Balancer]
        end

        subgraph PrivateSubnets["Private Subnets"]
            direction LR
            style PrivateSubnets fill:#FF9900,stroke:#232F3E
            
            subgraph ECS["ECS Cluster"]
                direction LR
                style ECS fill:#EC7211,stroke:#232F3E
                
                subgraph TASK1["Fargate Task"]
                    style TASK1 fill:#EC7211,stroke:#232F3E
                    subgraph CONTAINER1["Go Container"]
                        style CONTAINER1 fill:#00A4A6,stroke:#232F3E
                        APP1[Go Application<br/>Port: 8080]
                    end
                end
                
                subgraph TASK2["Fargate Task (Auto-scaled)"]
                    style TASK2 fill:#EC7211,stroke:#232F3E
                    subgraph CONTAINER2["Go Container"]
                        style CONTAINER2 fill:#00A4A6,stroke:#232F3E
                        APP2[Go Application<br/>Port: 8080]
                    end
                end
                
                FARGATE[Fargate Service<br/>CPU: 256, Memory: 512MB]
            end

            subgraph Endpoints["VPC Endpoints"]
                direction LR
                style Endpoints fill:#FF9900,stroke:#232F3E
                
                ECR[ECR API Endpoint]
                ECRDOCKER[ECR Docker Endpoint]
                ELB[ELB Endpoint]
                CWLOGS[CloudWatch Logs Endpoint]
            end
        end
        
        SG_ALB[Security Group ALB<br/>Inbound: 80,443]
        SG_FARGATE[Security Group Fargate<br/>Inbound: 8080]
        SG_ENDPOINT[Security Group Endpoints<br/>Inbound: 443]
        
        FLOWLOG[VPC Flow Logs]
    end
    
    subgraph CloudWatch["CloudWatch"]
        style CloudWatch fill:#205B99,stroke:#232F3E
        LOGS[Flow Logs Group]
    end
    
    ALB -->|Port 8080| APP1
    ALB -->|Port 8080| APP2
    TASK1 --- FARGATE
    TASK2 --- FARGATE
    
    %% VPC Endpoint connections with correct relationships
    FARGATE -.->|Pull Images| ECR
    FARGATE -.->|Pull Images| ECRDOCKER
    FARGATE -.->|Health Checks| ELB
    FARGATE -.->|Container Logs| CWLOGS
    
    SG_ALB -.->|Protects| ALB
    SG_FARGATE -.->|Protects| TASK1
    SG_FARGATE -.->|Protects| TASK2
    SG_ENDPOINT -.->|Protects| Endpoints
    
    FLOWLOG -->|Logs| LOGS

    %% AWS Service styling
    classDef sg fill:#E7157B,stroke:#232F3E
    classDef flowlogs fill:#205B99,stroke:#232F3E
    classDef internet fill:#232F3E,stroke:#232F3E,color:#ffffff
    classDef endpoint fill:#E7157B,stroke:#232F3E

    class SG_ALB,SG_FARGATE,SG_ENDPOINT sg
    class FLOWLOG,LOGS flowlogs
    class INTERNET internet
    class ECR,ECRDOCKER,ELB,CWLOGS endpoint
```

### **2. Public Access Version**
- **Description**:
  - Uses public internet access for all external communications.
  - Assigns public IPs to ECS tasks and routes traffic directly to external services without VPC endpoints.
  - Simplifies setup and reduces fixed costs by avoiding VPC endpoint charges.
- **Trade-offs**:
  - Outbound data transfer costs may be higher than with VPC endpoints.
  - Public-facing IPs require strict security group configurations.

See [AWS Data Transfer Pricing](https://aws.amazon.com/blogs/architecture/overview-of-data-transfer-costs-for-common-architectures/) for detailed costs.

#### Diagram
```mermaid
graph TB
    
    subgraph VPC["VPC (2 AZs, No NAT)"]
        style VPC fill:#F2F3F4,stroke:#232F3E,stroke-width:2px
        
        subgraph PublicSubnets["Public Subnets"]
            style PublicSubnets fill:#FF9900,stroke:#232F3E
            ALB[Application Load Balancer]
            
            subgraph ECS["ECS Cluster"]
                style ECS fill:#EC7211,stroke:#232F3E
                
                subgraph TASK1["Fargate Task"]
                    style TASK1 fill:#EC7211,stroke:#232F3E
                    subgraph CONTAINER1["Go Container"]
                        style CONTAINER1 fill:#00A4A6,stroke:#232F3E
                        APP1[Go Application<br/>Port: 8080<br/>/hello endpoint]
                    end
                end
                
                subgraph TASK2["Fargate Task (Auto-scaled)"]
                    style TASK2 fill:#EC7211,stroke:#232F3E
                    subgraph CONTAINER2["Go Container"]
                        style CONTAINER2 fill:#00A4A6,stroke:#232F3E
                        APP2[Go Application<br/>Port: 8080<br/>/hello endpoint]
                    end
                end
                
                FARGATE[Fargate Service<br/>CPU: 256<br/>Memory: 512MB]
            end
        end
        
        SG_ALB[Security Group ALB<br/>Inbound: 80,443]
        SG_FARGATE[Security Group Fargate<br/>Inbound: 8080]
        
        FLOWLOG[VPC Flow Logs]
    end
    
    subgraph CloudWatch["CloudWatch"]
        style CloudWatch fill:#205B99,stroke:#232F3E
        LOGS[Flow Logs Group<br/>/vpc/flow-logs/HelloCdkStack]
    end
    
    INTERNET((Internet)) -->|HTTP/HTTPS| ALB
    ALB -->|Port 8080| APP1
    ALB -->|Port 8080| APP2
    TASK1 --- FARGATE
    TASK2 --- FARGATE
    
    SG_ALB -.->|Protects| ALB
    SG_FARGATE -.->|Protects| TASK1
    SG_FARGATE -.->|Protects| TASK2
    
    FLOWLOG -->|Logs| LOGS

    %% AWS Service styling
    classDef sg fill:#E7157B,stroke:#232F3E
    classDef flowlogs fill:#205B99,stroke:#232F3E
    classDef internet fill:#232F3E,stroke:#232F3E,color:#ffffff

    class SG_ALB,SG_FARGATE sg
    class FLOWLOG,LOGS flowlogs
    class INTERNET internet
```

## File Structure

### Root Directory
The root directory contains microservice-related files:
- **`Dockerfile`**: Used to containerize the microservice.
- **`main.go`**: Entry point for the microservice.
- Other configuration files: Refer to the [AWS CDK documentation](https://docs.aws.amazon.com/cdk/v2/guide/bootstrapping-env.html) for details on `cdk.json` and other CDK-related files.

### `lib` Directory
The `lib` directory contains the main stack files for both versions:
- **`hello-cdk-stack.ts`**: The CDK stack implementation.

## Deployment Instructions
Each version of the stack configuration is managed on separate branches:
- **`main` branch**: Contains the VPC Endpoints Version.
- **`public-access` branch**: Contains the Public Access Version.

### Installing and Configuring AWS CDK
1. **Install AWS CDK**:
   - Ensure Node.js (v16 or later) is installed.
   - Install the AWS CDK CLI globally:
     ```bash
     npm install -g aws-cdk
     ```

2. **Install Project Dependencies**:
   - Run the following command to install necessary development dependencies for TypeScript and Node.js type definitions:
     ```bash
     npm install -D @types/node typescript
     ```

3. **Bootstrap Your AWS Environment**:
   - If you haven’t already, bootstrap your AWS environment:
     ```bash
     cdk bootstrap
     ```
   - This step is required only once per AWS account and region. If your AWS CLI is already configured, this step will use your default credentials. Refer to the [AWS CDK documentation](https://docs.aws.amazon.com/cdk/latest/guide/bootstrapping.html) for more details.

4. **Verify the Installation**:
   - Confirm the CDK CLI is installed:
     ```bash
     cdk --version
     ```

### Steps to Deploy
1. Check out the branch for the desired version:
   ```bash
   git checkout main           # For VPC Endpoints Version
   git checkout public-access  # For Public Access Version
   ```

2. Ensure all necessary dependencies are installed:
   ```bash
   npm install
   ```

3. Deploy the stack using AWS CDK:
   ```bash
   cdk deploy
   ```

Ensure your AWS account has the appropriate permissions and that AWS CDK is configured correctly. Refer to the [AWS CDK documentation](https://docs.aws.amazon.com/cdk/latest/guide/work-with-cdk.html) for more details.

1. **Access the Microservice**:
   - After deployment, the CDK CLI will output the URL of the ALB. Access the microservice using this URL.
   - For either version, you can test the `/hello` endpoint with the following command:
     ```bash
     curl 'http://<ALB DNS>/hello?name=my%20beautiful%20friend'
     ```
     
---

For more details on each version, refer to the respective `lib/hello-cdk-stack.ts` file in the branch.
